// Host lookup and the copy mstsc puts on screen. Everything is projected from
// the seeded machines: there is no socket, no DNS and no remote machine.

const SUFFIXES = [".halcyon.local", ".halcyon.co", ".local"];

// The exact wording of the client's two common failures. Keep the line breaks:
// they are part of what makes the dialog recognisable.
const CONNECT_REASONS = [
  "Remote Deskhop can't connect to the remote computer for one of these reasons:",
  "",
  "1) Remote access to the server is not enabled",
  "2) The remote computer is turned off",
  "3) The remote computer is not available on the network",
  "",
  "Make sure the remote computer is turned on and connected to the network, and that remote access is enabled.",
].join("\n");

export const ERROR_COPY = {
  find: (host) => ({
    heading: null,
    message:
      `Remote Deskhop can't find the computer "${host}". This might mean that "${host}" does not belong to the ` +
      "specified network. Verify the computer name and domain that you are trying to connect to.",
  }),
  disabled: () => ({ heading: null, message: CONNECT_REASONS }),
  unavailable: () => ({ heading: null, message: CONNECT_REASONS }),
  credentials: (host) => ({
    heading: "Your credentials did not work",
    message: `The credentials that were used to connect to "${host}" did not work. Please enter the new credentials.`,
  }),
};

/** Trim, drop a \\\\ prefix and a :port suffix. Comparisons are case-insensitive. */
export function normalizeHost(value) {
  return String(value || "")
    .trim()
    .replace(/^\\\\/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

/** The hostname as the client would write it: no domain, no port. */
export function hostLabel(value) {
  return String(value || "").trim().replace(/^\\\\/, "").replace(/:\d+$/, "");
}

/** The seeded machine a typed name points at, or null. Accepts FQDNs. */
export function findMachine(world, value) {
  const wanted = normalizeHost(value);
  if (!wanted) return null;
  return (
    world.machines.all().find((machine) => {
      const name = machine.hostname.toLowerCase();
      return wanted === name || wanted.startsWith(`${name}.`) || SUFFIXES.some((suffix) => wanted === `${name}${suffix}`);
    }) || null
  );
}

/** A helpdesk laptop list is already a believable "recent computers" list. */
export function defaultRecentHosts(world) {
  return world.machines
    .all()
    .filter((machine) => machine.rdpEnabled)
    .slice(0, 3)
    .map((machine) => machine.hostname);
}

/** Most recent first, case-insensitive, capped so the row stays one line. */
export function pushRecent(list, host, limit = 4) {
  const name = hostLabel(host);
  if (!name) return list;
  return [name, ...list.filter((entry) => entry.toLowerCase() !== name.toLowerCase())].slice(0, limit);
}

const TIER = {
  1: { cpu: "Intel Core i3-8100 CPU @ 3.60GHz", ram: "8.00 GB" },
  2: { cpu: "Intel Core i5-10400 CPU @ 2.90GHz", ram: "16.0 GB" },
  3: { cpu: "Intel Core i7-12700 CPU @ 2.10GHz", ram: "32.0 GB" },
};

/** The facts the remote "This PC" and Start menu read, all from the store. */
export function machineFacts(world, machineId) {
  const machine = world.machines.get(machineId);
  if (!machine) return null;
  const owner = world.people.get(machine.ownerId);
  const tier = TIER[machine.hardwareTier] || TIER[1];
  const software = world.machines.installedSoftware(machine.id);
  const services = world.machines.services(machine.id);
  return {
    id: machine.id,
    hostname: machine.hostname,
    os: machine.os || "Doors 11 Pro 22H2",
    cpu: tier.cpu,
    ram: tier.ram,
    owner,
    department: owner ? world.people.departmentName(owner.id) : "Unknown",
    software,
    rdpService: services.find((service) => service.id === "svc_rdp")?.status || "unknown",
    ip: `10.14.7.${40 + machine.hardwareTier}`,
    initials: machine.hostname
      .replace(/[^a-z0-9]/gi, "")
      .slice(-2)
      .toUpperCase(),
  };
}
