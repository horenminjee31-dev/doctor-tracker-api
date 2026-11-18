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
import { serializePatient } from "../lib/serializers.js";

const DOCTOR_FIELDS = "name specialization hospital";

export const listPatients = asyncHandler(async (req, res) => {
  const query = req.valid.query;
  const { page, limit, skip } = buildPage(query);

  const filter = {};
  if (query.q) {
    const rx = textSearchRegex(query.q);
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { condition: rx }];
  }
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;
  if (query.doctorId) filter.doctor = query.doctorId;

  const visitDate = buildDateRange(query.from, query.to);
  if (visitDate) filter.visitDate = visitDate;

  const sort = SORT_OPTIONS[query.sort ?? "visit_newest"];

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("name age gender condition phone email notes visitDate doctor createdAt")
      .populate("doctor", DOCTOR_FIELDS)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  res.json({
    data: patients.map(serializePatient),
    meta: paginationMeta(total, { page, limit }),
  });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;

  const patient = await Patient.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .select("name age gender condition phone email notes visitDate doctor createdAt")
    .populate("doctor", DOCTOR_FIELDS)
    .lean();

  if (!patient) throw ApiError.notFound("Patient not found");
  res.json({ data: serializePatient(patient) });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const patient = await Patient.findByIdAndDelete(id).lean();
  if (!patient) throw ApiError.notFound("Patient not found");
  res.status(204).end();
});
