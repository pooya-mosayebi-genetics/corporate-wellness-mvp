import type { ClientRecord } from '../types/clients';
import { assessClientRisk } from './clientRisk';
import type { ClientRiskLevel } from './clientRisk';

export interface HrAggregates {
  total: number;
  male: number;
  female: number;
  avgBmi: number;
  avgPbf: number;
  avgVfl: number;
  avgSmm: number;
  avgTbwPercent: number;
  avgBioAgeGap: number;
  risk: Record<ClientRiskLevel, number>;
  riskPercent: Record<ClientRiskLevel, number>;
  highRiskPercentage: number;
  ageBuckets: { key: 'u30' | '30s' | '40s' | '50p'; count: number }[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const emptyBuckets = (): HrAggregates['ageBuckets'] => [
  { key: 'u30', count: 0 },
  { key: '30s', count: 0 },
  { key: '40s', count: 0 },
  { key: '50p', count: 0 },
];

export function computeHrAggregates(clients: ClientRecord[]): HrAggregates {
  const total = clients.length;

  if (total === 0) {
    return {
      total: 0,
      male: 0,
      female: 0,
      avgBmi: 0,
      avgPbf: 0,
      avgVfl: 0,
      avgSmm: 0,
      avgTbwPercent: 0,
      avgBioAgeGap: 0,
      risk: { high: 0, medium: 0, low: 0 },
      riskPercent: { high: 0, medium: 0, low: 0 },
      highRiskPercentage: 0,
      ageBuckets: emptyBuckets(),
    };
  }

  let male = 0;
  let female = 0;
  let sumBmi = 0;
  let sumPbf = 0;
  let sumVfl = 0;
  let sumSmm = 0;
  let sumTbw = 0;
  let sumBioGap = 0;

  const risk: Record<ClientRiskLevel, number> = { high: 0, medium: 0, low: 0 };
  const ageBuckets = emptyBuckets();

  for (const client of clients) {
    if (client.sex === 'male') male += 1;
    else female += 1;

    sumBmi += client.bmi;
    sumPbf += client.pbfPercent;
    sumVfl += client.vfl;
    sumSmm += client.smmKg;
    sumTbw += client.tbwPercent;
    sumBioGap += client.bioAge - client.age;

    risk[assessClientRisk(client).level] += 1;

    if (client.age < 30) ageBuckets[0].count += 1;
    else if (client.age < 40) ageBuckets[1].count += 1;
    else if (client.age < 50) ageBuckets[2].count += 1;
    else ageBuckets[3].count += 1;
  }

  const pct = (n: number) => Math.round((n / total) * 100);

  return {
    total,
    male,
    female,
    avgBmi: round1(sumBmi / total),
    avgPbf: round1(sumPbf / total),
    avgVfl: round1(sumVfl / total),
    avgSmm: round1(sumSmm / total),
    avgTbwPercent: round1(sumTbw / total),
    avgBioAgeGap: round1(sumBioGap / total),
    risk,
    riskPercent: {
      high: pct(risk.high),
      medium: pct(risk.medium),
      low: pct(risk.low),
    },
    highRiskPercentage: pct(risk.high),
    ageBuckets,
  };
}