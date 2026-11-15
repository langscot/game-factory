// Mock command handlers for the terminal. Every command returns text; nothing
// is executed on the real machine. The handlers read the same world the rest of
// the desktop does, so `net user` agrees with the Directory, `ipconfig` agrees
// with Task Manager, and `dir`/`type` agree with File Explorer and Notepad.

const WINDOWS_VERSION = "Microsoft Windows [Version 10.0.22621.4317]";
const POWERSHELL_VERSION = "5.1.22621.4391";
const DNS_SERVER = "dc01.halcyon.co";
const DNS_ADDRESS = "10.14.7.2";
const FREE_BYTES = 312458043392;

const COMMON_COMMANDS = [
  "cd",
  "cls",
  "dir",
  "echo",
  "exit",
  "gpupdate",
  "help",
  "hostname",
  "ipconfig",
  "net",
  "nslookup",
  "ping",
  "sfc",
  "tracert",
  "type",
  "whoami",
];

export const CMD_COMMANDS = [...COMMON_COMMANDS, "ver"];
export const PS_COMMANDS = [
  ...COMMON_COMMANDS,
  "cat",
  "Clear-Host",
  "clear",
  "gci",
  "gc",
  "Get-ChildItem",
  "Get-Content",
  "Get-Help",
  "ls",
  "pwd",
];

const CMD_HELP = [
  ["CD", "Displays the name of or changes the current directory."],
  ["CLS", "Clears the screen."],
  ["DIR", "Displays a list of files and subdirectories in a directory."],
  ["ECHO", "Displays messages."],
  ["EXIT", "Quits the CMD.EXE program (command interpreter)."],
  ["HOSTNAME", "Prints the name of the current host."],
  ["SFC", "Scans and repairs protected system files."],
  ["TYPE", "Displays the contents of a text file."],
  ["VER", "Displays the Windows version."],
];

const PS_HELP = [
  ["cd", "Sets the current location."],
  ["cls", "Clears the host window."],
  ["dir", "Gets the items in a location."],
  ["echo", "Sends the specified objects to the next command in the pipeline."],
  ["exit", "Closes the current PowerShell session."],
  ["help", "Shows the commands installed on this machine."],
  ["ipconfig", "Displays the IP configuration of this machine."],
  ["net", "Manages local users, groups and services."],
  ["ping", "Sends ICMP echo requests to a host."],
  ["type", "Gets the contents of a file."],
  ["whoami", "Displays the current domain and user name."],
];

const out = (text = "") => ({ k: "out", t: text });
const err = (text = "") => ({ k: "err", t: text });
const blank = () => out("");

const displayPath = (path) => (path === "C:" ? "C:\\" : String(path ?? "").replace(/\//g, "\\"));
const parentOf = (path) => (path === "C:" ? "C:" : path.slice(0, path.lastIndexOf("/")));
const hostnameOf = (env) => env.machine?.hostname || "DESKTOP-8H2K9L";
const ipOf = (machine) => `10.14.7.${40 + (machine?.hardwareTier || 2)}`;

const splitArgs = (rest) => {
  const args = [];
  const pattern = /"([^"]*)"|(\S+)/g;
  let match;
  while ((match = pattern.exec(rest))) args.push(match[1] ?? match[2]);
  return args;
};

const switchesOf = (args) => args.filter((arg) => /^\/[^/]/.test(arg)).map((arg) => arg.toLowerCase());
const pathArgsOf = (args) => args.filter((arg) => !/^\/[^/]/.test(arg) && !arg.startsWith("-"));

const serialFor = (hostname) => {
  let value = 0;
  for (const char of hostname) value = (value * 131 + char.charCodeAt(0)) % 0xffffffff;
  const hex = value.toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
};

const macFor = (hostname) => {
  let value = 7;
  for (const char of hostname) value = (value * 31 + char.charCodeAt(0)) % 0xffffff;
  return [0x3c, 0x52, 0x82, (value >> 16) & 255, (value >> 8) & 255, value & 255]
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join("-");
};

const isIp = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);

const findPerson = (world, query) => {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return null;
  return (
    world.people
      .all()
      .find((person) => person.logonName.toLowerCase() === term || person.displayName.toLowerCase() === term) || null
  );
};

// ---------------------------------------------------------------------------
// dir / cd / type
// ---------------------------------------------------------------------------

function directoryHeader(env, folderPath) {
  return [
    out(" Volume in drive C has no label."),
    out(` Volume Serial Number is ${serialFor(hostnameOf(env))}`),
    blank(),
    out(` Directory of ${displayPath(folderPath)}`),
    blank(),
  ];
}

function cmdDir(env) {
  const switches = switchesOf(env.args);
  const invalid = switches.find((item) => !["/a", "/b", "/p"].includes(item));
  if (invalid) return { lines: [err(`Invalid switch - "${invalid}".`)] };

  const bare = switches.includes("/b");
  const target = pathArgsOf(env.args).join(" ");
  const resolved = target ? env.fs.resolve(env.cwd, target) : { ok: true, path: env.cwd, kind: "folder" };

  if (!resolved.ok) {
    if (resolved.reason === "drive") return { lines: [err("The system cannot find the drive specified.")] };
    if (resolved.reason === "unc") return { lines: [err("CMD does not support UNC paths as current directories.")] };
    const shown = displayPath(resolved.path || target);
    if (bare) return { lines: [err("File Not Found")] };
    return {
      lines: [
        ...directoryHeader(env, shown),
        err("File Not Found"),
      ],
    };
  }

  const singleFile = resolved.kind === "file" ? env.fs.file(resolved.path) : null;
  const folderPath = singleFile ? parentOf(resolved.path) : resolved.path;
  const listing = singleFile
    ? { folders: [], files: [singleFile] }
    : env.fs.list(folderPath, { hidden: switches.includes("/a") });

  if (bare) {
    return { lines: [...listing.folders, ...listing.files].map((entry) => out(entry.name)) };
  }

  const lines = directoryHeader(env, folderPath);
  for (const folder of listing.folders) {
    lines.push(out(`${folder.modified}    ${"<DIR>".padEnd(15)}${folder.name}`));
  }
  for (const file of listing.files) {
    lines.push(out(`${file.modified}${String(file.bytes.toLocaleString("en-US")).padStart(18)} ${file.name}`));
  }
  const totalBytes = listing.files.reduce((sum, file) => sum + file.bytes, 0);
  lines.push(
    blank(),
    out(`${String(listing.files.length).padStart(16)} File(s)${String(totalBytes.toLocaleString("en-US")).padStart(15)} bytes`),
    out(`${String(listing.folders.length).padStart(16)} Dir(s)${String(FREE_BYTES.toLocaleString("en-US")).padStart(17)} bytes free`),
  );
  return { lines };
}

function psDateParts(modified) {
  const match = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})$/.exec(modified);
  return match ? { date: match[1], time: match[2] } : { date: modified, time: "" };
}

function psDirectoryTable(folderPath, listing) {
  const lines = [
    out(`    Directory: ${displayPath(folderPath)}`),
    blank(),
    blank(),
    out("Mode                 LastWriteTime         Length Name"),
    out("----                 -------------         ------ ----"),
  ];
  for (const folder of listing.folders) {
    const { date, time } = psDateParts(folder.modified);
    lines.push(out(`d-----        ${date}     ${time}                ${folder.name}`));
  }
  for (const file of listing.files) {
    const { date, time } = psDateParts(file.modified);
    lines.push(out(`-a----        ${date}     ${time}${String(file.bytes).padStart(14)} ${file.name}`));
  }
  return lines;
}

const PS_CMDLET_NAMES = {
  GetChildItem: "Get-ChildItem",
  SetLocation: "Set-Location",
  GetContent: "Get-Content",
};

function psPathError(env, command, target, cmdlet) {
  const shown = displayPath(target);
  return {
    lines: [
      err(`${command} : Cannot find path '${shown}' because it does not exist.`),
      out("At line:1 char:1"),
      out(`+ ${env.line}`),
      out(`+ ${"~".repeat(Math.max(1, env.line.length))}`),
      out(`    + CategoryInfo          : ObjectNotFound: (${shown}:String) [${PS_CMDLET_NAMES[cmdlet] || cmdlet}], ItemNotFoundException`),
      out(`    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.${cmdlet}Command`),
    ],
  };
}

function dirCommand(env) {
  if (env.shell === "cmd") return cmdDir(env);

  const target = pathArgsOf(env.args).join(" ");
  const resolved = target ? env.fs.resolve(env.cwd, target) : { ok: true, path: env.cwd, kind: "folder" };
  if (!resolved.ok) return psPathError(env, "Get-ChildItem", resolved.path || target, "GetChildItem");

  if (resolved.kind === "file") {
    const file = env.fs.file(resolved.path);
    return { lines: psDirectoryTable(parentOf(resolved.path), { folders: [], files: [file] }) };
  }
  const listing = env.fs.list(resolved.path);
  if (!listing.folders.length && !listing.files.length) {
    return { lines: [out(`    Directory: ${displayPath(resolved.path)}`), blank(), blank()] };
  }
  return { lines: psDirectoryTable(resolved.path, listing) };
}

function cdCommand(env) {
  const args = pathArgsOf(env.args);
  if (!args.length) {
    if (env.shell === "ps") return { cwd: env.fs.home, lines: [] };
    return { lines: [out(displayPath(env.cwd))] };
  }

  const resolved = env.fs.resolve(env.cwd, args.join(" "));
  if (!resolved.ok) {
    if (env.shell === "ps") return psPathError(env, "Set-Location", resolved.path || args.join(" "), "SetLocation");
    const message =
      resolved.reason === "drive"
        ? "The system cannot find the drive specified."
        : resolved.reason === "not-directory"
          ? "The directory name is invalid."
          : resolved.reason === "unc"
            ? "CMD does not support UNC paths as current directories."
            : "The system cannot find the path specified.";
    return { lines: [err(message)] };
  }
  if (resolved.kind !== "folder") {
    return {
      lines: [
        env.shell === "ps"
          ? err(`Set-Location : Cannot find path '${displayPath(resolved.path)}' because it does not exist.`)
          : err("The directory name is invalid."),
      ],
    };
  }
  return { cwd: resolved.path, lines: [] };
}

const BINARY_HEADERS = {
  exe: ["MZ", "This program cannot be run in DOS mode."],
  pdf: ["%PDF-1.7", "1 0 obj << /Type /Catalog /Pages 2 0 R >>"],
  office: ["PK", "[Content_Types].xml"],
  image: ["\u00ff\u00d8\u00ff\u00e0 JFIF", "\u0089PNG"],
};

function typeCommand(env) {
  const target = pathArgsOf(env.args).join(" ");
  if (!target) {
    return {
      lines: [
        env.shell === "ps"
          ? err("Get-Content : Cannot bind argument to parameter 'Path' because it is an empty string.")
          : err("The syntax of the command is incorrect."),
      ],
    };
  }

  const resolved = env.fs.resolve(env.cwd, target);
  if (!resolved.ok) {
    if (env.shell === "ps") return psPathError(env, "Get-Content", resolved.path || target, "GetContent");
    return { lines: [err("The system cannot find the file specified.")] };
  }
  if (resolved.kind === "folder") {
    return {
      lines: [
        env.shell === "ps"
          ? err(`Get-Content : Access to the path '${displayPath(resolved.path)}' is denied.`)
          : err("Access is denied."),
      ],
    };
  }

  const file = env.fs.file(resolved.path);
  if (file?.contents != null) {
    return { lines: String(file.contents).split("\n").map((line) => out(line)) };
  }
  const header = BINARY_HEADERS[file?.fileKind] || ["\u0090\u0093\u0000\u0000"];
  return {
    lines: [out(header[0]), out(header[1]), out("\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000")],
  };
}

// ---------------------------------------------------------------------------
// network
// ---------------------------------------------------------------------------

function buildHosts(env) {
  const hosts = {
    "halcyon.co": { name: "halcyon.co", ip: "93.184.216.34", ttl: 117, base: 12 },
    "www.halcyon.co": { name: "www.halcyon.co", ip: "93.184.216.34", ttl: 117, base: 12 },
    "intranet.halcyon.co": { name: "intranet.halcyon.co", ip: "10.14.7.20", ttl: 128, base: 1 },
    "mail.halcyon.co": { name: "mail.halcyon.co", ip: "10.14.7.12", ttl: 128, base: 1 },
    "fs01.halcyon.co": { name: "fs01.halcyon.co", ip: "10.14.7.15", ttl: 128, base: 1 },
    "print01.halcyon.co": { name: "print01.halcyon.co", ip: "10.14.7.16", ttl: 128, base: 2 },
    "dc01.halcyon.co": { name: "dc01.halcyon.co", ip: "10.14.7.2", ttl: 128, base: 1 },
    "time.halcyon.co": { name: "time.halcyon.co", ip: "10.14.7.3", ttl: 128, base: 1 },
  };
  for (const machine of env.world.machines.all()) {
    hosts[machine.hostname.toLowerCase()] = {
      name: machine.hostname,
      ip: ipOf(machine),
      ttl: 128,
      base: 1,
    };
  }
  if (env.machine) {
    hosts[env.machine.hostname.toLowerCase()] = {
      name: env.machine.hostname,
      ip: ipOf(env.machine),
      ttl: 128,
      base: 1,
    };
  }
  return hosts;
}

function resolveHost(target, env) {
  const term = String(target || "").toLowerCase();
  if (!term) return null;
  if (term === "localhost") {
    return { name: hostnameOf(env), ip: "127.0.0.1", ttl: 128, base: 1, local: true };
  }
  if (isIp(term)) {
    return {
      name: null,
      ip: term,
      ttl: term.startsWith("10.14.7.") ? 128 : 117,
      base: term.startsWith("10.14.7.") ? 1 : 10,
    };
  }
  return buildHosts(env)[term] || null;
}

function ipconfigCommand(env) {
  const switches = switchesOf(env.args);
  if (switches.includes("/flushdns")) {
    return {
      lines: [out("Windows IP Configuration"), blank(), out("Successfully flushed the DNS Resolver Cache."), blank()],
    };
  }

  const connected = env.machine?.network?.connected !== false;
  if (switches.includes("/displaydns")) {
    return {
      lines: [
        out("Windows IP Configuration"),
        blank(),
        out(`    ${hostnameOf(env).toLowerCase()}.halcyon.co`),
        out("    ----------------------------------------"),
        out(`    Record Name . . . . . : ${hostnameOf(env).toLowerCase()}.halcyon.co`),
        out("    Record Type . . . . . : 1"),
        out("    Time To Live  . . . . : 884"),
        out("    Data Length . . . . . : 4"),
        out("    Section . . . . . . . : Answer"),
        out(`    A (Host) Record . . . : ${ipOf(env.machine)}`),
        blank(),
      ],
    };
  }

  if (switches.includes("/all")) {
    const adapter = env.machine?.devices?.find((device) => device.kind === "network")?.name || "Intel(R) Ethernet Connection I219-LM";
    const lines = [
      out("Windows IP Configuration"),
      blank(),
      out(`   Host Name . . . . . . . . . . . . : ${hostnameOf(env)}`),
      out("   Primary Dns Suffix  . . . . . . . : halcyon.co"),
      out("   Node Type . . . . . . . . . . . . : Hybrid"),
      out("   IP Routing Enabled. . . . . . . . : No"),
      out("   WINS Proxy Enabled. . . . . . . . : No"),
      out("   DNS Suffix Search List. . . . . . : halcyon.co"),
      blank(),
      out("Ethernet adapter Ethernet:"),
      blank(),
    ];
    if (!connected) {
      lines.push(
        out("   Media State . . . . . . . . . . . : Media disconnected"),
        out("   Connection-specific DNS Suffix  . :"),
        out(`   Description . . . . . . . . . . . : ${adapter}`),
        out(`   Physical Address. . . . . . . . . : ${macFor(hostnameOf(env))}`),
        out("   DHCP Enabled. . . . . . . . . . . : Yes"),
        out("   Autoconfiguration Enabled . . . . : Yes"),
      );
      lines.push(blank());
      return { lines };
    }
    lines.push(
      out("   Connection-specific DNS Suffix  . : halcyon.co"),
      out(`   Description . . . . . . . . . . . : ${adapter}`),
      out(`   Physical Address. . . . . . . . . : ${macFor(hostnameOf(env))}`),
      out("   DHCP Enabled. . . . . . . . . . . : Yes"),
      out("   Autoconfiguration Enabled . . . . : Yes"),
      out(`   IPv4 Address. . . . . . . . . . . : ${ipOf(env.machine)}(Preferred)`),
      out("   Subnet Mask . . . . . . . . . . . : 255.255.255.0"),
      out("   Lease Obtained. . . . . . . . . . : 15 November 2026 07:58:12"),
      out("   Lease Expires . . . . . . . . . . : 16 November 2026 07:58:11"),
      out("   Default Gateway . . . . . . . . . : 10.14.7.1"),
      out("   DHCP Server . . . . . . . . . . . : 10.14.7.2"),
      out("   DNS Servers . . . . . . . . . . . : 10.14.7.2"),
      out("                                       10.14.7.3"),
      out("   NetBIOS over Tcpip. . . . . . . . : Enabled"),
    );
    lines.push(blank());
    return { lines };
  }

  const text = env.world.machines.ipconfig(env.machine?.id);
  return { lines: [...String(text).split("\n").map((line) => out(line)), blank()] };
}

function pingCommand(env) {
  let count = 4;
  let target = "";
  for (let index = 0; index < env.args.length; index += 1) {
    const arg = env.args[index];
    if (/^-n$/i.test(arg)) {
      const value = Number(env.args[index + 1]);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        return { lines: [err("Bad value for option -n, valid range is from 1 to 10.")] };
      }
      count = Math.floor(value);
      index += 1;
    } else if (/^-/.test(arg)) {
      return { lines: [err(`Bad option ${arg}.`)] };
    } else {
      target = arg;
    }
  }

  if (!target) return { lines: [out("Usage: ping [-n count] target_name")] };

  const host = resolveHost(target, env);
  if (!host) {
    return { lines: [err(`Ping request could not find host ${target}. Please check the name and try again.`)] };
  }

  const label = host.name ? `${host.name} [${host.ip}]` : host.ip;
  const connected = env.machine?.network?.connected !== false;
  const lines = [out(`Pinging ${label} with 32 bytes of data:`)];
  const jobs = [];
  let minimum = 99;
  let maximum = 0;
  let total = 0;

  for (let index = 0; index < count; index += 1) {
    if (!connected) {
      jobs.push({ at: 0.55 * (index + 1), lines: [out("PING: transmit failed. General failure.")] });
      continue;
    }
    const slow = host.base + (index % 3);
    const value = host.local && index === 0 ? 0 : slow;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    total += value;
    const timing = value === 0 ? "time<1ms" : `time=${value}ms`;
    jobs.push({
      at: 0.55 * (index + 1),
      lines: [out(`Reply from ${host.ip}: bytes=32 ${timing} TTL=${host.ttl}`)],
    });
  }

  const lost = connected ? 0 : count;
  const received = count - lost;
  jobs.push({
    at: 0.55 * (count + 1),
    lines: [
      blank(),
      out(`Ping statistics for ${host.ip}:`),
      out(`    Packets: Sent = ${count}, Received = ${received}, Lost = ${lost} (${Math.round((lost / count) * 100)}% loss),`),
      ...(connected
        ? [
            out("Approximate round trip times in milli-seconds:"),
            out(
              `    Minimum = ${minimum}ms, Maximum = ${maximum}ms, Average = ${Math.round(total / count)}ms`,
            ),
          ]
        : []),
    ],
  });

  return { lines, jobs };
}

function tracertCommand(env) {
  const target = env.args.find((arg) => !arg.startsWith("-"));
  if (!target) return { lines: [out("Usage: tracert [-d] target_name")] };

  const host = resolveHost(target, env);
  if (!host) return { lines: [err(`Unable to resolve target system name ${target}.`)] };

  const heading = host.name ? `Tracing route to ${host.name} [${host.ip}]` : `Tracing route to ${host.ip}`;
  const lines = [out(heading), out("over a maximum of 30 hops:"), blank()];

  let hops;
  if (host.local) {
    hops = [`  1    <1 ms    <1 ms    <1 ms  ${host.name} [127.0.0.1]`];
  } else if (host.ip === "10.14.7.1") {
    hops = ["  1     1 ms     1 ms     1 ms  10.14.7.1"];
  } else if (host.ip.startsWith("10.14.7.")) {
    hops = [
      "  1    <1 ms    <1 ms    <1 ms  10.14.7.1",
      `  2     2 ms     1 ms     2 ms  ${host.name || host.ip} [${host.ip}]`,
    ];
  } else {
    hops = [
      "  1    <1 ms    <1 ms    <1 ms  10.14.7.1",
      "  2     4 ms     3 ms     4 ms  172.16.4.1",
      "  3    11 ms    10 ms    11 ms  195.66.224.10",
      `  4    14 ms    13 ms    14 ms  ${host.name || host.ip} [${host.ip}]`,
    ];
  }

  const jobs = hops.map((hop, index) => ({ at: 0.4 * (index + 1), lines: [out(hop)] }));
  jobs.push({ at: 0.4 * (hops.length + 1), lines: [blank(), out("Trace complete.")] });
  return { lines, jobs };
}

function nslookupCommand(env) {
  const target = env.args.find((arg) => !arg.startsWith("-"));
  const lines = [out(`Server:  ${DNS_SERVER}`), out(`Address:  ${DNS_ADDRESS}`), blank()];
  if (!target) return { lines };

  if (isIp(target)) {
    const reverse = Object.entries(buildHosts(env)).find(([, host]) => host.ip === target);
    if (reverse) {
      return { lines: [...lines, out(`Name:    ${reverse[1].name}`), out(`Address:  ${target}`)] };
    }
    return { lines: [...lines, err(`*** ${DNS_SERVER} can't find ${target}: Non-existent domain`)] };
  }

  const host = buildHosts(env)[target.toLowerCase()];
  if (host) return { lines: [...lines, out(`Name:    ${host.name}`), out(`Address:  ${host.ip}`)] };
  return { lines: [...lines, err(`*** ${DNS_SERVER} can't find ${target}: Non-existent domain`)] };
}

// ---------------------------------------------------------------------------
// net
// ---------------------------------------------------------------------------

const netSyntax = () => [
  out("The syntax of this command is:"),
  blank(),
  out("NET [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |"),
  out("      HELPMSG | LOCALGROUP | PAUSE | PRINT | SESSION | SHARE | START |"),
  out("      STATISTICS | STOP | TIME | USE | USER | VIEW ]"),
  blank(),
  blank(),
  out("More help is available by typing NET HELPMSG 3534."),
];

function localGroups(env) {
  const people = env.world.people.all();
  const logons = (ids) => people.filter((person) => ids.includes(person.id)).map((person) => person.logonName);
  const itAdmins = people.filter((person) => person.groupIds.includes("g_it_admins")).map((person) => person.logonName);
  return [
    {
      name: "Administrators",
      comment: "Administrators have complete and unrestricted access to the computer/domain",
      members: ["Administrator", ...itAdmins].sort((a, b) => a.localeCompare(b)),
    },
    {
      name: "Backup Operators",
      comment: "Backup Operators can override security restrictions for the sole purpose of backing up or restoring files",
      members: logons(["p_marge"]),
    },
    { name: "Guests", comment: "Guests have the same access as members of the Users group by default", members: ["Guest"] },
    {
      name: "IT Admins",
      comment: "Halcyon IT staff. Full control on the IT share.",
      members: [...itAdmins].sort((a, b) => a.localeCompare(b)),
    },
    {
      name: "Print Operators",
      comment: "Members can administer printers installed on domain controllers",
      members: logons(["p_marge", "p_hayes"]),
    },
    {
      name: "Remote Desktop Users",
      comment: "Members in this group are granted the right to logon remotely",
      members: people.filter((person) => person.remote).map((person) => person.logonName),
    },
    {
      name: "Users",
      comment: "Users are prevented from making accidental or intentional system-wide changes",
      members: people.filter((person) => person.account.state !== "disabled").map((person) => person.logonName),
    },
  ];
}

function netUser(env, args) {
  const query = pathArgsOf(args).join(" ");
  if (!query) {
    const names = ["Administrator", "DefaultAccount", "Guest", ...env.world.people.all().map((person) => person.logonName)];
    const lines = [out(`User accounts for \\\\${hostnameOf(env)}`), blank(), out("-".repeat(79))];
    for (let index = 0; index < names.length; index += 3) {
      lines.push(out(names.slice(index, index + 3).map((name) => name.padEnd(25)).join("").trimEnd()));
    }
    lines.push(out("The command completed successfully."));
    return { lines };
  }

  const person = findPerson(env.world, query);
  if (!person) {
    return {
      lines: [err("The user name could not be found."), blank(), out("More help is available by typing NET HELPMSG 2221.")],
    };
  }

  const groups = env.world.people.groupsOf(person.id).map((group) => `*${group.name}`);
  const active = person.account.state === "disabled" ? "No" : "Yes";
  const lines = [
    out(`User name                    ${person.logonName}`),
    out(`Full Name                    ${person.displayName}`),
    out(`Comment                      ${person.title}`),
    out("User's comment"),
    out("Country/region code          000 (System Default)"),
    out(`Account active               ${active}`),
    out("Account expires              Never"),
    ...(person.account.state === "locked" ? [out("Account locked               Yes")] : []),
    blank(),
    out("Password last set            09/11/2026 08:12"),
    out("Password expires             Never"),
    out("Password changeable          09/11/2026 08:12"),
    out("Password required            Yes"),
    out("User may change password     Yes"),
    blank(),
    out("Workstations allowed         All"),
    out("Logon script"),
    out("User profile"),
    out("Home directory"),
    out(`Last logon                   ${person.account.lastLogon || "15/11/2026 08:12"}`),
    blank(),
    out("Logon hours allowed          All"),
    blank(),
    out(`Local Group Memberships      ${groups.length ? groups.join("  ") : "*None"}`),
    out("Global Group memberships     *None"),
    out("The command completed successfully."),
  ];
  return { lines };
}

function netLocalGroup(env, args) {
  const query = pathArgsOf(args).join(" ");
  const groups = localGroups(env);

  if (!query) {
    const lines = [out(`Aliases for \\\\${hostnameOf(env)}`), blank(), out("-".repeat(79))];
    for (const group of groups) lines.push(out(`*${group.name}`));
    lines.push(blank(), out("The command completed successfully."));
    return { lines };
  }

  const group = groups.find((item) => item.name.toLowerCase() === query.toLowerCase());
  if (!group) {
    return {
      lines: [
        err("The specified local group does not exist."),
        out("More help is available by typing NET HELPMSG 2220."),
      ],
    };
  }

  return {
    lines: [
      out(`Alias name     ${group.name}`),
      out(`Comment        ${group.comment}`),
      blank(),
      out("Members"),
      blank(),
      out("-".repeat(79)),
      ...group.members.map((member) => out(member)),
      out("The command completed successfully."),
    ],
  };
}

function netStart(env, args) {
  const name = pathArgsOf(args).join(" ");
  if (name) {
    // The desk account is a standard user. A real attempt would fail like this.
    return { lines: [err("System error 5 has occurred."), blank(), err("Access is denied.")] };
  }
  const services = env.world.machines.services(env.machine?.id).filter((service) => service.status === "running");
  return {
    lines: [
      out("These Windows services are started:"),
      blank(),
      ...services.map((service) => out(`   ${service.displayName}`)),
      blank(),
      out("The command completed successfully."),
    ],
  };
}

function netCommand(env) {
  const sub = (env.args[0] || "").toLowerCase();
  const rest = env.args.slice(1);
  if (sub === "user") return netUser(env, rest);
  if (sub === "localgroup") return netLocalGroup(env, rest);
  if (sub === "start") return netStart(env, rest);
  if (sub === "stop") return { lines: [err("System error 5 has occurred."), blank(), err("Access is denied.")] };
  return { lines: netSyntax() };
}

// ---------------------------------------------------------------------------
// policy, integrity, identity
// ---------------------------------------------------------------------------

function gpupdateCommand() {
  return {
    lines: [
      out("Updating policy..."),
      blank(),
      out("Computer Policy update has completed successfully."),
      out("User Policy update has completed successfully."),
    ],
  };
}

function sfcCommand(env) {
  if (!env.args.some((arg) => /^\/scannow$/i.test(arg))) {
    return {
      lines: [
        out("Microsoft (R) Windows (R) Resource Checker 6.0"),
        out("Copyright (C) Microsoft Corporation. All rights reserved."),
        blank(),
        out("Scans the integrity of all protected system files and replaces incorrect versions with correct Microsoft versions."),
        blank(),
        out("SFC [/SCANNOW] [/VERIFYONLY] [/SCANFILE=<file>] [/VERIFYFILE=<file>]"),
        out("    [/OFFWINDIR=<offline windows directory> /OFFBOOTDIR=<offline boot directory>]"),
      ],
    };
  }
  return {
    lines: [out("Beginning system scan.  This process will take some time."), blank()],
    jobs: [
      {
        at: 1.2,
        lines: [out("Beginning verification phase of system scan."), out("Verification 100% complete."), blank()],
      },
      { at: 2.1, lines: [out("Windows Resource Protection did not find any integrity violations.")] },
    ],
  };
}

function whoamiCommand(env) {
  const base = `${hostnameOf(env).toLowerCase()}\\${env.person?.logonName || "m.hayes"}`;
  if (env.args.some((arg) => arg.toLowerCase() === "/user")) {
    return {
      lines: [
        out("USER INFORMATION"),
        out("----------------"),
        blank(),
        out(`User Name      ${hostnameOf(env).toUpperCase()}\\${env.person?.logonName || "m.hayes"}`),
        out("SID            S-1-5-21-144127-1023-1140-1001"),
      ],
    };
  }
  return { lines: [out(base)] };
}

// ---------------------------------------------------------------------------
// help and errors
// ---------------------------------------------------------------------------

function helpCommand(env) {
  if (env.shell === "ps") {
    const lines = [
      out("Name                           Description"),
      out("----                           -----------"),
      ...PS_HELP.map(([name, description]) => out(`${name.padEnd(31)}${description}`)),
      blank(),
      out(`Windows PowerShell ${POWERSHELL_VERSION}`),
    ];
    return { lines };
  }

  const lines = [
    out("For more information on a specific command, type HELP command-name"),
    ...CMD_HELP.map(([name, description]) => out(`${name.padEnd(15)}${description}`)),
    blank(),
    out("These programs are also on the PATH:"),
    out("  GPUPDATE  IPCONFIG  NET  NSLOOKUP  PING  TRACERT  WHOAMI"),
  ];
  return { lines };
}

function unknownLines(env) {
  if (env.shell === "ps") {
    return [
      err(
        `${env.name} : The term '${env.name}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
      ),
      out("At line:1 char:1"),
      out(`+ ${env.line}`),
      out(`+ ${"~".repeat(Math.max(1, env.name.length))}`),
      out(`    + CategoryInfo          : ObjectNotFound: (${env.name}:String) [], CommandNotFoundException`),
      out("    + FullyQualifiedErrorId : CommandNotFoundException"),
    ];
  }
  return [
    err(`'${env.name}' is not recognized as an internal or external command,`),
    err("operable program or batch file."),
  ];
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

/**
 * Run one mock command line. Returns output lines plus optional side effects:
 * a new cwd, a screen clear, a window close, or delayed jobs for the clock.
 */
export function execute({ shell, line, cwd, fs, world, machine, person }) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed) return { lines: [] };

  const space = trimmed.search(/\s/);
  const name = space === -1 ? trimmed : trimmed.slice(0, space);
  const rest = space === -1 ? "" : trimmed.slice(space + 1);

  if (shell === "cmd" && /^echo\./i.test(trimmed)) {
    return { lines: [out(trimmed.slice(5))] };
  }

  const env = {
    shell,
    line: trimmed,
    name,
    rest,
    args: splitArgs(rest),
    cwd,
    fs,
    world,
    machine,
    person,
  };

  switch (name.toLowerCase()) {
    case "help":
      return helpCommand(env);
    case "cls":
      return { clear: true, lines: [] };
    case "echo":
      return echoCommand(env);
    case "dir":
      return dirCommand(env);
    case "cd":
    case "chdir":
      return cdCommand(env);
    case "type":
      return typeCommand(env);
    case "ipconfig":
      return ipconfigCommand(env);
    case "ping":
      return pingCommand(env);
    case "tracert":
      return tracertCommand(env);
    case "nslookup":
      return nslookupCommand(env);
    case "net":
      return netCommand(env);
    case "gpupdate":
      return gpupdateCommand(env);
    case "sfc":
      return sfcCommand(env);
    case "whoami":
      return whoamiCommand(env);
    case "hostname":
      return { lines: [out(hostnameOf(env))] };
    case "ver":
      if (shell === "cmd") return { lines: [out(WINDOWS_VERSION)] };
      return { lines: unknownLines(env) };
    case "exit":
      return { close: true, lines: [] };
    default:
      break;
  }

  if (shell === "ps") {
    switch (name.toLowerCase()) {
      case "clear":
      case "clear-host":
        return { clear: true, lines: [] };
      case "ls":
      case "gci":
      case "get-childitem":
        return dirCommand(env);
      case "pwd":
        return { lines: [out(displayPath(cwd))] };
      case "cat":
      case "gc":
      case "get-content":
        return typeCommand(env);
      case "get-help":
        return helpCommand(env);
      default:
        break;
    }
  }

  return { lines: unknownLines(env) };
}

function echoCommand(env) {
  if (env.shell === "ps") return { lines: env.args.length ? [out(env.args.join(" "))] : [] };
  if (!env.rest) return { lines: [out("ECHO is on.")] };
  if (/^(on|off)$/i.test(env.rest.trim())) return { lines: [] };
  return { lines: [out(env.rest)] };
}
