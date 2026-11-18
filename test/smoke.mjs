import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "smoke-test-secret-key-that-is-long-enough-1234";
process.env.CLIENT_ORIGIN = "http://localhost:3000";
process.env.COOKIE_SECURE = "false";

const { connectDatabase, disconnectDatabase } = await import("../src/config/db.js");
const { createApp } = await import("../src/app.js");
const { User } = await import("../src/models/User.js");
const { Doctor } = await import("../src/models/Doctor.js");
const { Patient } = await import("../src/models/Patient.js");

const mongo = await MongoMemoryServer.create();

async function main() {
  await connectDatabase(mongo.getUri("doctor_tracker_smoke"));

  await User.create({
    name: "Smoke Admin",
    email: "admin@test.dev",
    passwordHash: await bcrypt.hash("Admin@12345", 4),
    role: "admin",
  });

  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const request = async (path, { method = "GET", body, cookie } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; "),
    };
  };

  let passed = 0;
  const check = (label, condition) => {
    assert.ok(condition, label);
    passed += 1;
    console.log(`  ok  ${label}`);
  };

  console.log("\nAuth");
  const unauthenticated = await request("/doctors");
  check("rejects unauthenticated requests with 401", unauthenticated.status === 401);

  const badLogin = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@test.dev", password: "wrong-password" },
  });
  check("rejects invalid credentials with 401", badLogin.status === 401);

  const login = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@test.dev", password: "Admin@12345" },
  });
  check("logs in and sets an httpOnly cookie", login.status === 200 && login.cookie.startsWith("dt_session="));
  const cookie = login.cookie;

  const me = await request("/auth/me", { cookie });
  check("returns the current user", me.status === 200 && me.body.user.email === "admin@test.dev");

  console.log("\nDoctors");
  const created = await request("/doctors", {
    method: "POST",
    cookie,
    body: {
      name: "Dr. Smoke Test",
      specialization: "Cardiology",
      hospital: "Test Hospital",
      phone: "+880 1700 000000",
      email: "smoke@doctortracker.dev",
    },
  });
  check("creates a doctor", created.status === 201 && created.body.data.patientCount === 0);

  const duplicate = await request("/doctors", {
    method: "POST",
    cookie,
    body: {
      name: "Dr. Duplicate",
      specialization: "Cardiology",
      hospital: "Test Hospital",
      phone: "+880 1700 000001",
      email: "smoke@doctortracker.dev",
    },
  });
  check("rejects duplicate doctor email with 409", duplicate.status === 409);

  const invalid = await request("/doctors", {
    method: "POST",
    cookie,
    body: { name: "X", specialization: "Nope", hospital: "", phone: "1", email: "bad" },
  });
  check("returns field-level validation details with 422", invalid.status === 422 && invalid.body.details.length >= 3);

  const second = await request("/doctors", {
    method: "POST",
    cookie,
    body: {
      name: "Dr. Alpha Beta",
      specialization: "Neurology",
      hospital: "Alpha Clinic",
      phone: "+880 1700 000002",
      email: "alpha@doctortracker.dev",
    },
  });

  const doctorId = created.body.data.id ?? created.body.data._id;
  const secondId = second.body.data.id ?? second.body.data._id;

  const doctorUpdated = await request(`/doctors/${doctorId}`, {
    method: "PATCH",
    cookie,
    body: { hospital: "Updated Smoke Hospital" },
  });
  check(
    "updates a doctor",
    doctorUpdated.status === 200 &&
      doctorUpdated.body.data.hospital === "Updated Smoke Hospital"
  );

  const emptyDoctor = await request("/doctors", {
    method: "POST",
    cookie,
    body: {
      name: "Dr. Delete Me",
      specialization: "ENT",
      hospital: "Temporary Clinic",
      phone: "+880 1700 000003",
      email: "delete@doctortracker.dev",
    },
  });
  const emptyDoctorId = emptyDoctor.body.data.id ?? emptyDoctor.body.data._id;

  const deletedEmptyDoctor = await request(`/doctors/${emptyDoctorId}`, {
    method: "DELETE",
    cookie,
  });
  check(
    "deletes an empty doctor",
    deletedEmptyDoctor.status === 204
  );

  const search = await request("/doctors?q=alpha&specialization=Neurology&page=1&limit=1", { cookie });
  check(
    "search + filter + pagination return the right slice",
    search.status === 200 &&
      search.body.data.length === 1 &&
      search.body.data[0].email === "alpha@doctortracker.dev" &&
      search.body.meta.total === 1
  );

  const sorted = await request("/doctors?sort=name", { cookie });
  check(
    "sorts doctors by name",
    sorted.body.data[0].name.localeCompare(sorted.body.data[1].name) <= 0
  );

  console.log("\nDoctor patients");
  const patientPayload = {
    name: "Patient One",
    age: 34,
    gender: "female",
    condition: "Diabetes",
    phone: "+880 1800 000000",
    email: "patient.one@example.com",
    notes: "Smoke test patient",
    visitDate: "2026-11-10",
  };

  const patientResponse = await request(`/doctors/${doctorId}/patients`, {
    method: "POST",
    cookie,
    body: patientPayload,
  });
  check(
    "adds a patient under a doctor",
    patientResponse.status === 201 && patientResponse.body.data.doctor.id === doctorId
  );
  const patientId = patientResponse.body.data.id ?? patientResponse.body.data._id;

  const blockedDoctorDelete = await request(`/doctors/${doctorId}`, {
    method: "DELETE",
    cookie,
  });
  check(
    "blocks deleting a doctor with assigned patients",
    blockedDoctorDelete.status === 409
  );

  const nested = await request(`/doctors/${doctorId}/patients?q=patient&limit=5`, { cookie });
  check("lists patients for a doctor", nested.status === 200 && nested.body.meta.total === 1);

  const noDoctor = await request("/doctors/64b7f9c2b1a2c3d4e5f6a7b8/patients", { cookie });
  check("returns 404 for unknown doctor", noDoctor.status === 404);

  console.log("\nPatients");
  const patients = await request("/patients?condition=Diabetes&from=2026-11-01&to=2026-11-30", { cookie });
  check(
    "filters patients by condition and date range",
    patients.status === 200 && patients.body.data.every((row) => row.condition === "Diabetes")
  );

  const updated = await request(`/patients/${patientId}`, {
    method: "PATCH",
    cookie,
    body: { condition: "Hypertension", notes: "Updated via smoke test" },
  });
  check(
    "updates patient information",
    updated.status === 200 &&
      updated.body.data.condition === "Hypertension" &&
      updated.body.data.notes === "Updated via smoke test"
  );

  const badUpdate = await request(`/patients/${patientId}`, {
    method: "PATCH",
    cookie,
    body: {},
  });
  check("rejects empty updates with 422", badUpdate.status === 422);

  const deleted = await request(`/patients/${patientId}`, { method: "DELETE", cookie });
  check("deletes a patient", deleted.status === 204);
  const remaining = await Patient.countDocuments({ _id: patientId });
  check("patient is removed from the database", remaining === 0);

  console.log("\nDashboard");
  await Patient.create([
    { ...patientPayload, name: "Patient Two", doctor: doctorId, visitDate: new Date("2026-10-05") },
    { ...patientPayload, name: "Patient Three", condition: "Asthma", doctor: secondId, visitDate: new Date("2026-09-15") },
  ]);

  const dashboard = await request("/dashboard", { cookie });
  check(
    "returns totals and chart-ready series",
    dashboard.status === 200 &&
      dashboard.body.summary.totalDoctors === 2 &&
      dashboard.body.summary.totalPatients === 2 &&
      dashboard.body.trend.length === 6 &&
      dashboard.body.byCondition.length >= 1 &&
      dashboard.body.byDoctor.length === 2
  );

  const meta = await request("/meta", { cookie });
  check("exposes filter options", meta.status === 200 && meta.body.conditions.includes("Diabetes"));

  const logout = await request("/auth/logout", { method: "POST", cookie });
  check("logs out", logout.status === 204);

  const doctorCount = await Doctor.countDocuments();
  check("database state is consistent", doctorCount === 2);

  server.close();
  await disconnectDatabase();
  await mongo.stop();

  console.log(`\nAll ${passed} smoke checks passed.`);
}

main().catch(async (error) => {
  console.error("\nSmoke test failed:", error);
  await disconnectDatabase().catch(() => {});
  await mongo.stop().catch(() => {});
  process.exit(1);
});
