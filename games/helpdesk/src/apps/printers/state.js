// Mock Devices and Printers state. It lives in session.ui.printers so a redraw
// or another window sees the same printers, jobs and selection. Nothing here
// touches a real device, port or spooler.

const PRINTER_SEED = [
  {
    id: "prn_03",
    name: "HP LaserJet M404 – Floor 3",
    shareName: "\\\\PRINT01\\HP-Floor3",
    driver: "HP Universal Printing PCL 6",
    model: "HP LaserJet M404dn",
    location: "Floor 3 – East",
    port: "IP_10.14.7.31",
    status: "ready",
    default: true,
    shared: true,
    offline: false,
    paused: false,
    error: null,
    features: ["Duplex printing", "Monochrome", "Up to 40 ppm"],
  },
  {
    id: "prn_04",
    name: "Microsoft Print to PDF",
    shareName: "",
    driver: "Microsoft Print To PDF",
    model: "Microsoft Print to PDF",
    location: "Local port",
    port: "PORTPROMPT:",
    status: "ready",
    default: false,
    shared: false,
    offline: false,
    paused: false,
    error: null,
    features: ["Colour", "Saves a PDF file", "No paper required"],
  },
  {
    id: "prn_05",
    name: "Brother HL-L2350DW – Reception",
    shareName: "\\\\PRINT01\\Brother-Reception",
    driver: "Brother HL-L2350DW series",
    model: "Brother HL-L2350DW",
    location: "Reception",
    port: "WSD-3f21a9b4-7710-4c1e",
    status: "error",
    default: false,
    shared: true,
    offline: false,
    paused: false,
    error: "Paper jam in tray 1",
    features: ["Duplex printing", "Monochrome", "Wireless"],
  },
  {
    id: "prn_06",
    name: "HP LaserJet 1020 – Stores",
    shareName: "\\\\PRINT02\\HP-Stores",
    driver: "HP LaserJet 1020",
    model: "HP LaserJet 1020",
    location: "Stores – basement",
    port: "IP_10.14.7.44",
    status: "ready",
    default: false,
    shared: false,
    offline: true,
    paused: false,
    error: null,
    features: ["Monochrome", "USB 2.0", "Legacy driver"],
  },
];

const DEVICE_SEED = [
  { id: "dev_pc", name: "DESKTOP-8H2K9L", kind: "This PC", status: "ready", detail: "Desktop computer" },
  { id: "dev_monitor", name: "Generic PnP Monitor", kind: "Monitor", status: "ready", detail: "Display" },
  { id: "dev_keyboard", name: "USB Input Device", kind: "Keyboard", status: "ready", detail: "HID keyboard device" },
  { id: "dev_mouse", name: "HID-compliant mouse", kind: "Mouse", status: "ready", detail: "USB optical mouse" },
];

// Printers advertised by the mock network browse in the Add a printer wizard.
export const DISCOVERED_PRINTERS = [
  {
    shareName: "\\\\PRINT01\\Canon-Finance",
    name: "Canon iR-ADV C5535 – Finance",
    driver: "Canon Generic Plus UFR II",
    model: "Canon iR-ADV C5535",
    location: "Floor 2 – Finance",
    port: "IP_10.14.7.52",
    features: ["Colour", "Duplex printing", "Up to 35 ppm"],
  },
  {
    shareName: "\\\\PRINT01\\Zebra-Warehouse",
    name: "Zebra ZD421 – Warehouse",
    driver: "ZDesigner ZD421-203dpi ZPL",
    model: "Zebra ZD421",
    location: "Warehouse",
    port: "IP_10.14.7.61",
    features: ["Label printer", "Monochrome", "203 dpi"],
  },
  {
    shareName: "\\\\PRINT02\\Kyocera-Legal",
    name: "Kyocera TASKalfa 3554 – Legal",
    driver: "Kyocera TASKalfa 3554 KX",
    model: "Kyocera TASKalfa 3554ci",
    location: "Floor 4 – Legal",
    port: "IP_10.14.7.73",
    features: ["Colour", "Duplex printing", "Stapling"],
  },
];

const JOB_SEED = [
  {
    id: "job_4480",
    printerId: "prn_04",
    document: "Invoice-2211.pdf",
    status: "printing",
    ownerId: "p_dana",
    pages: 3,
    submittedAt: "09:04",
  },
  {
    id: "job_4481",
    printerId: "prn_05",
    document: "Visitor-badges-Week-46.docx",
    status: "error",
    ownerId: "p_ruth",
    pages: 24,
    submittedAt: "08:49",
  },
  {
    id: "job_4482",
    printerId: "prn_04",
    document: "Q4-forecast-v7.xlsx",
    status: "queued",
    ownerId: "p_sofia",
    pages: 2,
    submittedAt: "09:06",
  },
];

export function initialState(machine) {
  const seeded = [];
  const worldPrinter = machine?.printers?.find((printer) => printer.id === "prn_03");
  for (const job of worldPrinter?.queue || []) {
    seeded.push({
      ...job,
      printerId: "prn_03",
      // The world calls a spooler-blocked job "stuck"; the queue calls it an error.
      status: job.status === "stuck" ? "error" : job.status === "paused" ? "paused" : "queued",
      pages: job.id === "job_4471" ? 12 : 1,
    });
  }
  return {
    initialized: true,
    printers: structuredClone(PRINTER_SEED),
    devices: structuredClone(DEVICE_SEED).map((device) =>
      device.id === "dev_pc" && machine ? { ...device, name: machine.hostname } : device,
    ),
    jobs: [...seeded, ...structuredClone(JOB_SEED)],
    selectedPrinterId: "prn_03",
    selectedDeviceId: null,
    selectedJobId: null,
    queueOpen: false,
    nextJob: 5000,
  };
}

export function ensureState(ctx) {
  const current = ctx.world.session.ui("printers");
  if (current.initialized) return current;
  const machine = technicianMachine(ctx);
  const initial = initialState(machine);
  ctx.actions.setUi("printers", initial);
  return initial;
}

export function readState(ctx) {
  return ctx.world.session.ui("printers");
}

/** Copy, mutate and commit once; the ui:changed event repaints every open view. */
export function commit(ctx, mutate) {
  const draft = structuredClone(readState(ctx));
  mutate(draft);
  ctx.actions.setUi("printers", draft);
  return draft;
}

export function technicianMachine(ctx) {
  const session = ctx.world.session.current();
  return ctx.world.machines.byOwner(session.technicianId);
}

export function spoolerState(ctx) {
  const machine = technicianMachine(ctx);
  const service = machine ? ctx.world.machines.service(machine.id, "spooler") : null;
  return { running: service?.status === "running", service };
}

export function printerStatus(printer, spoolerRunning) {
  if (!spoolerRunning) {
    return { label: "Offline", kind: "offline", detail: "Print Spooler service is stopped" };
  }
  if (printer.offline) {
    return { label: "Offline", kind: "offline", detail: "Not connected to the network" };
  }
  if (printer.status === "error") {
    return { label: "Error", kind: "error", detail: printer.error || "Needs attention" };
  }
  if (printer.paused) {
    return { label: "Paused", kind: "warn", detail: "Printing is paused" };
  }
  return { label: "Ready", kind: "ready", detail: printer.default ? "Default printer" : "Ready to print" };
}

export function jobStatus(status) {
  const table = {
    queued: ["Queued", "queued"],
    printing: ["Printing", "printing"],
    paused: ["Paused", "warn"],
    error: ["Error – printing", "error"],
    complete: ["Printed", "done"],
    cancelled: ["Cancelled", "cancelled"],
  };
  const [label, kind] = table[status] || [status || "Unknown", "queued"];
  return { label, kind };
}

export function pendingJobs(state, printerId) {
  return state.jobs.filter(
    (job) => job.printerId === printerId && job.status !== "cancelled" && job.status !== "complete",
  );
}

export function addJob(ctx, { printerId, document, pages = 1, status = "printing" }) {
  const technicianId = ctx.world.session.current().technicianId;
  const submittedAt = ctx.clock.timeText();
  let created = null;
  commit(ctx, (draft) => {
    created = {
      id: `job_${draft.nextJob++}`,
      printerId,
      document,
      status,
      ownerId: technicianId,
      pages,
      submittedAt,
    };
    draft.jobs.push(created);
  });
  return created;
}
