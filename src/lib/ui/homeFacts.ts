/** Figures the home page states, computed from the data files, never typed in. */

import barangaysJson from "../../data/barangays.json";
import officesJson from "../../data/offices.json";
import officialsJson from "../../data/officials.json";
import servicesJson from "../../data/services.json";
import transparencyJson from "../../data/transparency.json";
import type {
  BarangayRecord,
  OfficeRecord,
  OfficialRecord,
  ServiceCategory,
  ServiceRecord,
  TransparencyRecord,
} from "../../data/types";

const services = servicesJson as ServiceRecord[];
const officials = officialsJson as OfficialRecord[];
const offices = officesJson as OfficeRecord[];
const barangays = barangaysJson as BarangayRecord[];
const transparency = transparencyJson as TransparencyRecord[];

/** What residents look for most, in that order; only categories with records show. */
const POPULAR: ServiceCategory[] = [
  "civil-registry",
  "business-permits",
  "real-property-tax",
  "health",
  "social-welfare",
  "treasurer",
];

export function homeFacts() {
  const current = officials.filter((official) => official.status === "current");
  const mayor = current.find(
    (official) => /mayor/i.test(official.role) && !/vice/i.test(official.role),
  );
  return {
    mayorName: mayor?.name,
    otherOfficials: current.length - (mayor ? 1 : 0),
    officeCount: offices.length,
    barangayCount: barangays.length,
    population: barangays.reduce((sum, b) => sum + (b.population2024 ?? 0), 0),
    popularCategories: POPULAR.filter((category) =>
      services.some((service) => service.category === category),
    ),
    transparencyCounts: {
      finance: transparency.filter((r) => r.kind === "financial-statement").length,
      procurement: transparency.filter((r) => r.kind === "procurement").length,
      infrastructure: transparency.filter((r) => r.kind === "infrastructure").length,
    },
  };
}
