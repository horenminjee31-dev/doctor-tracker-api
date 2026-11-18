import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase } from "../src/config/db.js";
import { Doctor } from "../src/models/Doctor.js";
import { Patient } from "../src/models/Patient.js";
import { User } from "../src/models/User.js";
import { CONDITIONS, GENDERS } from "../src/constants.js";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@doctortracker.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const ADMIN_NAME = "Horen Minzy";

const DOCTORS = [
  { name: "Dr. Ayesha Rahman", specialization: "Cardiology", hospital: "City General Hospital", phone: "+880 1711 204501" },
  { name: "Dr. Daniel Okafor", specialization: "Neurology", hospital: "St. Mary Medical Center", phone: "+880 1812 553102" },
  { name: "Dr. Sofia Marchetti", specialization: "Dermatology", hospital: "Green Valley Clinic", phone: "+880 1913 887403" },
  { name: "Dr. Tanvir Hasan", specialization: "Orthopedics", hospital: "Northbridge Health", phone: "+880 1614 220804" },
  { name: "Dr. Priya Nair", specialization: "Pediatrics", hospital: "Sunrise Specialty Hospital", phone: "+880 1515 664105" },
  { name: "Dr. Marcus Feld", specialization: "Psychiatry", hospital: "City General Hospital", phone: "+880 1716 330906" },
  { name: "Dr. Laila Haddad", specialization: "Oncology", hospital: "St. Mary Medical Center", phone: "+880 1817 991207" },
  { name: "Dr. Kenji Watanabe", specialization: "General Medicine", hospital: "Green Valley Clinic", phone: "+880 1918 442508" },
  { name: "Dr. Elena Petrova", specialization: "ENT", hospital: "Northbridge Health", phone: "+880 1619 775809" },
  { name: "Dr. Samuel Adeyemi", specialization: "Ophthalmology", hospital: "Sunrise Specialty Hospital", phone: "+880 1520 118010" },
  { name: "Dr. Fatima Al-Sayed", specialization: "Gastroenterology", hospital: "City General Hospital", phone: "+880 1721 905311" },
  { name: "Dr. Lucas Bernard", specialization: "Endocrinology", hospital: "St. Mary Medical Center", phone: "+880 1822 447612" },
];

const FIRST_NAMES = [
  "Nadia", "Rafiq", "Amara", "Jonas", "Mei", "Tariq", "Isabel", "Hasan", "Leila", "Omar",
  "Elif", "Noah", "Anika", "Samuel", "Yara", "Karim", "Zoe", "Imran", "Chloe", "Ravi",
  "Hana", "Malik", "Grace", "Dmitri", "Aisha", "Liam", "Noor", "Ethan", "Salma", "Victor",
  "Rina", "Ahmed", "Clara", "Bilal", "Ivy", "Farhan", "Maya", "Tobias", "Sana", "Julian",
];
const LAST_NAMES = [
  "Hossain", "Karim", "Mensah", "Weber", "Chen", "Iqbal", "Duarte", "Chowdhury", "Haddad", "Farouk",
  "Demir", "Bennett", "Sharma", "Osei", "Aziz", "Rahman", "Kim", "Siddiqui", "Moreau", "Patel",
  "Tanaka", "Diallo", "Okafor", "Volkov", "Nasser", "Murphy", "Hussain", "Clarke", "Yusuf", "Silva",
];
const NOTES = [
  "Routine follow-up scheduled.",
  "Responding well to current treatment.",
  "Needs lab work before next visit.",
  "Advised lifestyle and diet changes.",
  "Referred to specialist for further evaluation.",
  "",
];

// Deterministic PRNG so the demo dataset is reproducible on every seed run.
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261117);
const pick = (items) => items[Math.floor(random() * items.length)];
const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;

function visitDateWithinLastMonths(months) {
  const now = Date.now();
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - months);
  const date = new Date(start.getTime() + random() * (now - start.getTime()));
  date.setUTCHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return date;
}

async function seed() {
  await connectDatabase(env.mongoUri);
  console.log("Connected to MongoDB");

  await Promise.all([User.init(), Doctor.init(), Patient.init()]);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, role: "admin" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin ready: ${ADMIN_EMAIL}`);

  await Promise.all([Patient.deleteMany({}), Doctor.deleteMany({})]);
  console.log("Cleared existing doctors and patients");

  const doctors = await Doctor.insertMany(
    DOCTORS.map((doctor, index) => ({
      ...doctor,
      email: doctor.name
        .replace(/^Dr\.\s*/, "")
        .toLowerCase()
        .replace(/[^a-z]+/g, ".")
        .replace(/^\.|\.$/g, "") + `@doctortracker.dev`,
      createdAt: visitDateWithinLastMonths(6 - (index % 5)),
    }))
  );
  console.log(`Inserted ${doctors.length} doctors`);

  const patients = Array.from({ length: 86 }, () => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    return {
      name: `${first} ${last}`,
      age: randomInt(4, 89),
      gender: pick(GENDERS),
      condition: pick(CONDITIONS),
      phone: `+880 1${randomInt(3, 9)}${randomInt(10, 99)} ${randomInt(100000, 999999)}`,
      email: `${first}.${last}${randomInt(10, 99)}@example.com`.toLowerCase(),
      notes: pick(NOTES),
      visitDate: visitDateWithinLastMonths(6),
      doctor: pick(doctors)._id,
    };
  });

  await Patient.insertMany(patients);
  console.log(`Inserted ${patients.length} patients`);

  console.log("\nSign in with:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
