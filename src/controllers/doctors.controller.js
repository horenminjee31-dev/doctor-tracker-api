import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  buildDateRange,
  buildPage,
  paginationMeta,
  SORT_OPTIONS,
  textSearchRegex,
} from "../lib/query.js";
import { serializeDoctor, serializePatient } from "../lib/serializers.js";

const PATIENT_LIST_FIELDS =
  "name age gender condition phone email notes visitDate doctor createdAt";

export const listDoctors = asyncHandler(async (req, res) => {
  const query = req.valid.query;
  const { page, limit, skip } = buildPage(query);

  const filter = {};
  if (query.q) {
    const rx = textSearchRegex(query.q);
    filter.$or = [
      { name: rx },
      { specialization: rx },
      { hospital: rx },
      { email: rx },
    ];
  }
  if (query.specialization) filter.specialization = query.specialization;

  const createdAt = buildDateRange(query.from, query.to);
  if (createdAt) filter.createdAt = createdAt;

  const sort = SORT_OPTIONS[query.sort ?? "newest"];

  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("name specialization hospital phone email createdAt")
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  const doctorIds = doctors.map((doctor) => doctor._id);
  const patientStats = doctorIds.length
    ? await Patient.aggregate([
        { $match: { doctor: { $in: doctorIds } } },
        {
          $group: {
            _id: "$doctor",
            patientCount: { $sum: 1 },
            lastVisitAt: { $max: "$visitDate" },
          },
        },
      ])
    : [];

  const statsByDoctor = new Map(patientStats.map((stat) => [String(stat._id), stat]));

  res.json({
    data: doctors.map((doctor) => {
      const stats = statsByDoctor.get(String(doctor._id));
      return serializeDoctor(doctor, {
        patientCount: stats?.patientCount ?? 0,
        lastVisitAt: stats?.lastVisitAt ?? null,
      });
    }),
    meta: paginationMeta(total, { page, limit }),
  });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.create(req.body);
  res.status(201).json({
    data: serializeDoctor(doctor.toObject(), { patientCount: 0, lastVisitAt: null }),
  });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const doctor = await Doctor.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!doctor) throw ApiError.notFound("Doctor not found");

  const [stats] = await Patient.aggregate([
    { $match: { doctor: doctor._id } },
    {
      $group: {
        _id: null,
        patientCount: { $sum: 1 },
        lastVisitAt: { $max: "$visitDate" },
      },
    },
  ]);

  res.json({
    data: serializeDoctor(doctor, {
      patientCount: stats?.patientCount ?? 0,
      lastVisitAt: stats?.lastVisitAt ?? null,
    }),
  });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const patientCount = await Patient.countDocuments({ doctor: id });
  if (patientCount > 0) {
    throw ApiError.conflict(
      `Cannot delete this doctor because ${patientCount} patient${patientCount === 1 ? "" : "s"} are assigned to them`
    );
  }

  const doctor = await Doctor.findByIdAndDelete(id).lean();
  if (!doctor) throw ApiError.notFound("Doctor not found");
  res.status(204).end();
});

export const getDoctor = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;

  const doctor = await Doctor.findById(id)
    .select("name specialization hospital phone email createdAt")
    .lean();
  if (!doctor) throw ApiError.notFound("Doctor not found");

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [stats] = await Patient.aggregate([
    { $match: { doctor: doctor._id } },
    {
      $group: {
        _id: null,
        totalPatients: { $sum: 1 },
        lastVisitAt: { $max: "$visitDate" },
        thisMonth: {
          $sum: { $cond: [{ $gte: ["$visitDate", monthStart] }, 1, 0] },
        },
      },
    },
  ]);

  res.json({
    data: serializeDoctor(doctor, {
      summary: {
        totalPatients: stats?.totalPatients ?? 0,
        thisMonth: stats?.thisMonth ?? 0,
        lastVisitAt: stats?.lastVisitAt ?? null,
      },
    }),
  });
});

export const listDoctorPatients = asyncHandler(async (req, res) => {
  const { doctorId } = req.valid.params;
  const query = req.valid.query;
  const { page, limit, skip } = buildPage(query);

  const doctorExists = await Doctor.exists({ _id: doctorId });
  if (!doctorExists) throw ApiError.notFound("Doctor not found");

  const filter = { doctor: doctorId };
  if (query.q) {
    const rx = textSearchRegex(query.q);
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { condition: rx }];
  }
  if (query.condition) filter.condition = query.condition;

  const visitDate = buildDateRange(query.from, query.to);
  if (visitDate) filter.visitDate = visitDate;

  const sort = SORT_OPTIONS[query.sort ?? "visit_newest"];

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(PATIENT_LIST_FIELDS)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  res.json({
    data: patients.map(serializePatient),
    meta: paginationMeta(total, { page, limit }),
  });
});

export const addDoctorPatient = asyncHandler(async (req, res) => {
  const { doctorId } = req.valid.params;

  const doctor = await Doctor.findById(doctorId).select("name specialization").lean();
  if (!doctor) throw ApiError.notFound("Doctor not found");

  const patient = await Patient.create({ ...req.body, doctor: doctorId });
  res.status(201).json({
    data: serializePatient({
      ...patient.toObject(),
      doctor: { ...doctor, _id: doctorId },
    }),
  });
});
