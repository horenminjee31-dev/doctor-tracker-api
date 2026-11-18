export function serializeDoctor(doctor, extra = {}) {
  return {
    id: String(doctor._id),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    createdAt: doctor.createdAt,
    ...extra,
  };
}

function serializeDoctorRef(doctor) {
  if (!doctor) return null;
  if (typeof doctor !== "object" || !("name" in doctor)) {
    return { id: String(doctor) };
  }
  return {
    id: String(doctor._id),
    name: doctor.name,
    specialization: doctor.specialization,
    ...(doctor.hospital ? { hospital: doctor.hospital } : {}),
  };
}

export function serializePatient(patient) {
  return {
    id: String(patient._id),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    condition: patient.condition,
    phone: patient.phone,
    email: patient.email,
    notes: patient.notes,
    visitDate: patient.visitDate,
    createdAt: patient.createdAt,
    doctor: serializeDoctorRef(patient.doctor),
  };
}
