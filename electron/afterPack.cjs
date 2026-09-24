const fs = require("node:fs");
const path = require("node:path");

// electron-builder's extraResources αφαιρεί (σιωπηλά) το node_modules μέσα στο
// standalone bundle — μάλλον ο εσωτερικός dependency-walker του το περνάει για
// "ξένο"/περιττό. Το ξαναβάζουμε εδώ, μετά το packaging αλλά ΠΡΙΝ φτιαχτεί το
// NSIS installer (afterPack τρέχει ακριβώς σε αυτό το σημείο).
module.exports = async function afterPack(context) {
  const src = path.join(__dirname, "..", ".next", "standalone", "node_modules");
  const dest = path.join(context.appOutDir, "resources", "standalone", "node_modules");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
};
