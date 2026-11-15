// Mock data for the Task Mangler shell. Nothing here touches the machine:
// process figures are seeded sine waves, and the only real facts are the open
// windows (through ctx.ui.windows()) and the services in the world store.

const SAMPLE_SECONDS = 0.25;
const HISTORY_POINTS = 60;
const ETHERNET_SCALE = 20;

// [id, name, publisher, startup impact in seconds, enabled at boot, tile colour]
const STARTUP = [
  ["edge", "Glorp", "Glorp Systems", 1.4, true, "#2f8ae0"],
  ["teams", "Halcyon Huddle", "Halcyon Dynamics", 2.2, true, "#5b5fc7"],
  ["onedrive", "OneDrain", "Nadir Systems", 1.2, true, "#2d7bd6"],
  ["spotify", "Spotify", "Spotify AB", 2.0, false, "#1db954"],
  ["slack", "Slack", "Slack Technologies", 0.5, false, "#4a154b"],
  ["office", "Nadir Office Start", "Nadir Systems", 0.4, true, "#c43e1c"],
];
const STARTUP_BASE_SECONDS = 5.2;

const SOFTWARE_NAMES = {
  "winword.exe": "Microsoft Word",
  "slack.exe": "Slack",
  "chrome.exe": "Google Chrome",
  "code.exe": "Visual Studio Code",
  "notepad++.exe": "Notepad++",
  "7zfm.exe": "7-Zip File Manager",
  "teamviewer.exe": "TeamViewer",
};

const TIERS = {
  1: { ram: 8, cpu: "Intel Core i3-8100 @ 3.60GHz", speed: "3.60 GHz", cores: 4 },
  2: { ram: 16, cpu: "Intel Core i5-10400 @ 2.90GHz", speed: "2.90 GHz", cores: 6 },
  3: { ram: 32, cpu: "Intel Core i7-12700 @ 2.10GHz", speed: "2.10 GHz", cores: 12 },
};

const SERVICE_USERS = ["SYSTEM", "LOCAL SERVICE", "NETWORK SERVICE"];

// ---------------------------------------------------------------------------
// small deterministic helpers
// ---------------------------------------------------------------------------

function hash(value) {
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable 0..1 value for a name, so PIDs and phases never flicker. */
const unit = (value, salt = 0) => (hash(`${value}|${salt}`) % 10000) / 10000;
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function processName(name) {
  const service = /^svchost\.exe \((.+)\)$/i.exec(name);
  return service ? `Service Host: ${service[1]}` : name;
}

function appName(name) {
  return SOFTWARE_NAMES[String(name).toLowerCase()] || processName(name);
}

// ---------------------------------------------------------------------------
// process figures
// ---------------------------------------------------------------------------

function figuresFor(process, t) {
  const seed = process.seedKey;
  const a = unit(seed, 1);
  const b = unit(seed, 2);
  const c = unit(seed, 3);
  const phase = b * Math.PI * 2;

  const profile = {
    app: { cpu: 2.6, mem: 170, disk: 1.1, net: 0.8 },
    software: { cpu: 2.2, mem: 300, disk: 1.4, net: 0.7 },
    system: { cpu: 1.2, mem: 190, disk: 0.7, net: 0.25 },
    service: { cpu: 0.55, mem: 30, disk: 0.2, net: 0.06 },
  }[process.kind] || { cpu: 1, mem: 80, disk: 0.5, net: 0.2 };

  const cpuBase = 0.1 + a * profile.cpu;
  const spike = Math.pow(Math.max(0, Math.sin(t * (0.08 + c * 0.07) + phase)), 22) * profile.cpu * 2.3;
  const cpu = clamp(
    cpuBase + profile.cpu * 0.45 * Math.sin(t * (0.45 + c * 0.5) + phase) + profile.cpu * 0.16 * Math.sin(t * 1.8 + phase * 2) + spike,
    0.05,
    68,
  );
  const memMB = Math.max(4, a * profile.mem + profile.mem * 0.22 + profile.mem * 0.025 * Math.sin(t * 0.12 + phase));
  const disk = Math.max(
    0,
    profile.disk * (0.2 + 0.8 * Math.pow(Math.max(0, Math.sin(t * (0.22 + a * 0.2) + phase)), 3)) +
      profile.disk * 0.15 * Math.sin(t * 1.2 + phase),
  );
  const net = Math.max(
    0,
    profile.net * (0.15 + Math.pow(Math.max(0, Math.sin(t * (0.18 + b * 0.25) + phase)), 4)) +
      profile.net * 0.06 * Math.sin(t * 1.6 + phase),
  );

  if (process.status === "Suspended") {
    return { cpu: 0, memMB, diskMBps: 0, netMbps: 0 };
  }
  return { cpu, memMB, diskMBps: disk, netMbps: net };
}

function aggregate(processes, t) {
  const total = { cpu: 0, memMB: 0, diskMBps: 0, netMbps: 0 };
  for (const process of processes) {
    const figures = figuresFor(process, t);
    total.cpu += figures.cpu;
    total.memMB += figures.memMB;
    total.diskMBps += figures.diskMBps;
    total.netMbps += figures.netMbps;
  }
  return total;
}

// ---------------------------------------------------------------------------
// performance history
// ---------------------------------------------------------------------------

export function createPerformance(ctx) {
  const tier = ctx.session.hardwareTier() || 2;
  const history = { cpu: [], memory: [], disk: [], ethernet: [] };
  const current = { cpu: 22, memory: 46, disk: 2, ethernet: 1.4 };
  let elapsed = 0;
  let accumulator = 0;

  const targets = (t) => {
    const open = ctx.ui.windows().length;
    const memoryBias = tier === 1 ? 9 : tier === 3 ? -4 : 0;
    return {
      cpu: clamp(
        6 +
          Math.min(28, open * 3.1) +
          6.4 * Math.sin(t * 0.23) +
          2.3 * Math.sin(t * 0.91 + 1.3) +
          Math.pow(Math.max(0, Math.sin(t * 0.29 + 1.7)), 18) * 34,
        3,
        92,
      ),
      memory: clamp(
        39 + memoryBias + Math.min(10, open * 1.1) + 3.1 * Math.sin(t * 0.05) + 0.6 * Math.sin(t * 0.37 + 2),
        28,
        82,
      ),
      disk: clamp(
        0.8 +
          9 * Math.pow(Math.max(0, Math.sin(t * 0.17 + 0.6)), 6) +
          2 * Math.pow(Math.max(0, Math.sin(t * 0.73 + 1.2)), 12),
        0.2,
        100,
      ),
      ethernet: clamp(
        0.25 +
          2.6 * (0.5 + 0.5 * Math.sin(t * 0.42 + 0.3)) +
          5.8 * Math.pow(Math.max(0, Math.sin(t * 0.13 + 1.1)), 8),
        0.05,
        ETHERNET_SCALE,
      ),
    };
  };

  const push = (key, value) => {
    history[key].push(value);
    if (history[key].length > HISTORY_POINTS) history[key].shift();
  };

  const step = (t) => {
    const target = targets(t);
    for (const key of ["cpu", "memory", "disk", "ethernet"]) {
      current[key] += (target[key] - current[key]) * 0.28;
      push(key, current[key]);
    }
  };

  // Start with a full graph rather than an empty box.
  for (let i = HISTORY_POINTS; i > 0; i -= 1) step(-i * SAMPLE_SECONDS);

  return {
    advance(dt) {
      elapsed += dt;
      accumulator += dt;
      let steps = 0;
      while (accumulator >= SAMPLE_SECONDS && steps < 3) {
        accumulator -= SAMPLE_SECONDS;
        steps += 1;
        step(elapsed);
      }
      if (steps === 3) accumulator = 0;
    },
    latest() {
      return {
        cpu: history.cpu[history.cpu.length - 1],
        memory: history.memory[history.memory.length - 1],
        disk: history.disk[history.disk.length - 1],
        ethernet: history.ethernet[history.ethernet.length - 1],
      };
    },
    history,
    uptimeSeconds: () => 19732 + elapsed,
    tier,
    ethernetScale: ETHERNET_SCALE,
  };
}

// ---------------------------------------------------------------------------
// the model
// ---------------------------------------------------------------------------

export function createModel(ctx) {
  const session = ctx.world.session.current();
  const machine = ctx.world.machines.byOwner(session.technicianId);
  const technician = session.technician;
  const perf = createPerformance(ctx);
  const tier = TIERS[session.hardwareTier] || TIERS[2];
  const network = machine?.devices.find((device) => device.kind === "network") || null;
  const ipconfig = machine ? ctx.world.machines.ipconfig(machine.id) : "";
  const ipv4 = /IPv4 Address[^:]*:\s*([\d.]+)/.exec(ipconfig)?.[1] || "10.14.7.42";

  let elapsed = 0;

  function makeProcess({ id, name, kind, icon, windowId = null, status = "Running", user }) {
    return {
      id,
      name,
      kind,
      icon,
      windowId,
      status,
      user,
      seedKey: id,
      pid:
        kind === "system"
          ? 300 + (hash(id) % 1800)
          : kind === "service"
            ? 1200 + (hash(id) % 3600)
            : 2200 + (hash(id) % 9000),
    };
  }

  function collect(stopped) {
    const openWindows = ctx.ui.windows();
    const apps = openWindows
      .map((win) => {
        const status = win.minimized ? "Suspended" : "Running";
        const process = makeProcess({
          id: `win:${win.id}`,
          name: win.title,
          kind: "app",
          icon: win.icon || "folder",
          windowId: win.id,
          status,
          user: technician?.logonName || "m.hayes",
        });
        return {
          id: `app:${win.id}`,
          section: "apps",
          name: win.title,
          icon: win.icon || "folder",
          windowId: win.id,
          single: false,
          processes: [process],
          status,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const background = [];
    const system = [];
    const processes = machine ? ctx.world.machines.processes(machine.id) : [];
    for (const [index, entry] of processes.entries()) {
      const isSoftware = entry.kind === "software";
      const suffix = isSoftware
        ? `${slug(entry.name)}-${index}`
        : `${slug(entry.name)}-${hash(entry.name) % 97}`;
      const id = `proc:${entry.kind}:${suffix}`;
      if (stopped.has(id)) continue;
      const user = isSoftware
        ? technician?.logonName || "m.hayes"
        : entry.kind === "service"
          ? SERVICE_USERS[hash(entry.name) % SERVICE_USERS.length]
          : entry.name === "File Exploder"
            ? technician?.logonName || "m.hayes"
            : "SYSTEM";
      const status = isSoftware && hash(entry.name) % 7 === 0 ? "Suspended" : "Running";
      const process = makeProcess({
        id,
        name: processName(entry.name),
        kind: entry.kind === "software" ? "software" : entry.kind === "service" ? "service" : "system",
        icon: isSoftware ? "settings" : "taskmgr",
        status,
        user,
      });
      const group = {
        id: `${isSoftware ? "bg" : "sys"}:${id}`,
        section: isSoftware ? "background" : "system",
        name: isSoftware ? appName(entry.name) : processName(entry.name),
        icon: isSoftware ? "settings" : "taskmgr",
        windowId: null,
        single: true,
        processes: [process],
        status,
      };
      (isSoftware ? background : system).push(group);
    }
    background.sort((a, b) => a.name.localeCompare(b.name));
    system.sort((a, b) => a.name.localeCompare(b.name));

    return { apps, background, system };
  }

  return {
    collect,
    advance(dt) {
      elapsed += dt;
      perf.advance(dt);
    },
    statsFor(process) {
      return figuresFor(process, elapsed);
    },
    aggregate(processes) {
      return aggregate(processes, elapsed);
    },
    perf,
    tier,
    totalMemoryGB: tier.ram,
    networkName: network?.name || "Intel Ethernet Connection I219-LM",
    ipv4,
    uptimeSeconds: perf.uptimeSeconds,
    startupRows(enabled) {
      return STARTUP.map(([id, name, publisher, seconds, defaultValue, color]) => ({
        id,
        name,
        publisher,
        seconds,
        color,
        enabled: enabled[id] ?? defaultValue,
      }));
    },
    bootSeconds(enabled) {
      return STARTUP.reduce((total, [id, , , seconds, defaultValue]) => total + ((enabled[id] ?? defaultValue) ? seconds : 0), STARTUP_BASE_SECONDS);
    },
    services() {
      return machine ? ctx.world.machines.services(machine.id) : [];
    },
    processCount(stopped) {
      const groups = collect(stopped);
      return groups.apps.length + groups.background.length + groups.system.length;
    },
  };
}

export function defaultStartupState() {
  return Object.fromEntries(STARTUP.map(([id, , , , enabled]) => [id, enabled]));
}

export function formatBoot(seconds) {
  return `${seconds.toFixed(1)} seconds`;
}

export function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${days}:${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

export function formatCpu(value) {
  if (value <= 0.05) return "0%";
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`;
}

export function formatMemory(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatDisk(value) {
  return `${value.toFixed(1)} MB/s`;
}

export function formatNet(value) {
  if (value < 0.05) return "0 Mbps";
  return `${value.toFixed(1)} Mbps`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function formatMbps(value) {
  return `${value.toFixed(1)} Mbps`;
}

export { ETHERNET_SCALE, HISTORY_POINTS };
