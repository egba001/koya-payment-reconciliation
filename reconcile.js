// Payment reconciliation.

const fs = require("fs");

function parseAmount(raw) {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw.replace(/,/g, "").trim());
  return NaN;
}

// Keep only the latest attempt per txn_id.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim().length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (event === null || typeof event !== "object") continue;
  if (typeof event.txn_id !== "string" || event.txn_id.length === 0) continue;

  const time = Date.parse(event.ts);
  const prev = latest.get(event.txn_id);
  if (prev === undefined || time > prev.time) {
    latest.set(event.txn_id, { time, status: event.status, amount: event.amount });
  }
}

let total = 0;
let count = 0;
for (const { status, amount } of latest.values()) {
  if (status !== "success") continue;
  const value = parseAmount(amount);
  if (Number.isNaN(value)) throw new Error(`Unparseable amount: ${JSON.stringify(amount)}`);
  total += value;
  count += 1;
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
