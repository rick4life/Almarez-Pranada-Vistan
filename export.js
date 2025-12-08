const fs = require("fs");
const admin = require("firebase-admin");

// Initialize Firebase with your Service Account key
admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json")
});

const db = admin.firestore();

// Function to export a single collection
async function exportCollection(colName) {
  const snap = await db.collection(colName).get();
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  fs.writeFileSync(`${colName}.json`, JSON.stringify(data, null, 2));
  console.log(`Exported ${colName}.json`);
}

// Main function to export all collections
async function run() {
  await exportCollection("users");
  await exportCollection("lost_items");
  await exportCollection("found_items");
}

run();
