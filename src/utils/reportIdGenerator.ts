// src/utils/reportIdGenerator.ts
import { db } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

export async function generateReportId() {
  const counterRef = doc(db, "metadata", "reportCounter");

  const newId = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);

    if (!snap.exists()) {
      throw new Error("reportCounter missing in Firestore!");
    }

    const lastNumber = snap.data().lastNumber ?? 0;
    const nextNumber = lastNumber + 1;

    // Save new value
    transaction.update(counterRef, { lastNumber: nextNumber });

    // Format ID example: R-001
    return `R-${String(nextNumber).padStart(3, "0")}`;
  });

  return newId;
}
