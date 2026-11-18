import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const TREND_MONTHS = 6;

function startOfMonthUtc(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1));
}

function trendMonths() {
  return Array.from({ length: TREND_MONTHS }, (_, index) => {
    const date = startOfMonthUtc(TREND_MONTHS - 1 - index);
    return {
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    };
  });
}

const monthBucket = (field) => ({
  $dateToString: { format: "%Y-%m", date: `$${field}`, timezone: "UTC" },
});

export const getDashboard = asyncHandler(async (_req, res) => {
  const monthStart = startOfMonthUtc();
  const trendStart = startOfMonthUtc(TREND_MONTHS - 1);

  const [patientAggregation, doctorAggregation] = await Promise.all([
    Patient.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                lastVisitAt: { $max: "$visitDate" },
              },
            },
          ],
          thisMonth: [{ $match: { visitDate: { $gte: monthStart } } }, { $count: "value" }],
          byMonth: [
            { $match: { visitDate: { $gte: trendStart } } },
            { $group: { _id: monthBucket("visitDate"), count: { $sum: 1 } } },
          ],
          byCondition: [
            { $group: { _id: "$condition", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 },
          ],
          byDoctor: [
            { $group: { _id: "$doctor", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 6 },
            {
              $lookup: {
                from: "doctors",
                localField: "_id",
                foreignField: "_id",
                as: "doctor",
              },
            },
            { $unwind: "$doctor" },
            {
              $project: {
                _id: 0,
                doctorId: "$_id",
                name: "$doctor.name",
                specialization: "$doctor.specialization",
                count: 1,
              },
            },
          ],
          recentPatients: [
            { $sort: { visitDate: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "doctors",
                localField: "doctor",
                foreignField: "_id",
                as: "doctor",
              },
            },
            { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                id: "$_id",
                name: 1,
                condition: 1,
                visitDate: 1,
                doctorId: "$doctor._id",
                doctorName: "$doctor.name",
              },
            },
          ],
        },
      },
    ]),
    Doctor.aggregate([
      {
        $facet: {
          totals: [{ $count: "value" }],
          byMonth: [
            { $match: { createdAt: { $gte: trendStart } } },
            { $group: { _id: monthBucket("createdAt"), count: { $sum: 1 } } },
          ],
        },
      },
    ]),
  ]);

  const patients = patientAggregation[0];
  const doctors = doctorAggregation[0];

  const patientMonths = new Map(patients.byMonth.map((row) => [row._id, row.count]));
  const doctorMonths = new Map(doctors.byMonth.map((row) => [row._id, row.count]));

  const totalDoctors = doctors.totals[0]?.value ?? 0;
  const totalPatients = patients.totals[0]?.total ?? 0;

  res.json({
    summary: {
      totalDoctors,
      totalPatients,
      patientsThisMonth: patients.thisMonth[0]?.value ?? 0,
      avgPatientsPerDoctor: totalDoctors
        ? Number((totalPatients / totalDoctors).toFixed(1))
        : 0,
      lastVisitAt: patients.totals[0]?.lastVisitAt ?? null,
    },
    trend: trendMonths().map(({ month, label }) => ({
      month,
      label,
      patients: patientMonths.get(month) ?? 0,
      doctors: doctorMonths.get(month) ?? 0,
    })),
    byCondition: patients.byCondition.map((row) => ({
      label: row._id,
      value: row.count,
    })),
    byDoctor: patients.byDoctor,
    recentPatients: patients.recentPatients,
  });
});
