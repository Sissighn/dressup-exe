const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * electron-builder skips signing when `mac.identity` is null, which leaves the
 * bundle with Electron's original linker signature and no resource seal - the
 * app then fails `codesign --verify` and Gatekeeper refuses it after a copy.
 * Re-signing ad-hoc makes the bundle self-consistent without a developer
 * certificate. The app is still unsigned in Apple's sense (not notarized).
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`  • ad-hoc signing  file=${appPath}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
    stdio: "inherit",
  });
  execFileSync("codesign", ["--verify", "--strict", appPath], { stdio: "inherit" });
};
