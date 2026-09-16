import { SSPClients } from "@repo/shared";
import { DBFFile } from "dbffile";

export const parseDbfFile = async (
  filePath: string
): Promise<SSPClients[]> => {
  const dbf = await DBFFile.open(filePath);

  const records = await dbf.readRecords();

  return records.map((record) => ({
    ID: Number(record.ID),
    NAME: String(record.NAME ?? "").trim(),
    IN_DATE: record.IN_DATE as Date,
    ACTPNSN: Number(record.ACTPNSN ?? 0),
    TERMS: Number(record.TERMS ?? 0),
    MOINST: Number(record.MOINST ?? 0),
    LOANAMT: Number(record.LOANAMT ?? 0),
    BIRTH: record.BIRTH as Date,
    PTYPE: String(record.PTYPE ?? "").trim(),
    AGENT: String(record.AGENT ?? "").trim(),
    BRNCHADD: String(record.BRNCHADD ?? "").trim(),
  }));
};