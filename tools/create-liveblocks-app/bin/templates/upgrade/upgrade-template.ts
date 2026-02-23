type Flags = {
  upgrade: string;
};

export async function create(flags: Flags) {
  console.log();
  console.log(
    "This command is now deprecated. Use the newer liveblocks CLI directly instead:"
  );
  console.log();
  if (flags.upgrade && flags.upgrade !== "latest") {
    console.log(`  npx liveblocks@latest upgrade ${flags.upgrade}`);
  } else {
    console.log("  npx liveblocks@latest upgrade");
  }
  console.log();
}
