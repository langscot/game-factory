// Device Mangler's catalogue. The world seeds only five generic devices per
// machine, but devmgmt.msc needs the real device classes, so the extra
// rows are shell content. Mutations are session overrides kept in
// world.session.ui("devmgmt"), never a second store.

export const CLASSES = [
  { id: "audio", name: "Audio inputs and outputs" },
  { id: "batteries", name: "Batteries" },
  { id: "display", name: "Display adapters" },
  { id: "firmware", name: "Firmware" },
  { id: "hid", name: "Human Interface Devices" },
  { id: "keyboards", name: "Keyboards" },
  { id: "mice", name: "Mice and other pointing devices" },
  { id: "monitors", name: "Monitors" },
  { id: "network", name: "Network adapters" },
  { id: "print", name: "Print queues" },
  { id: "processors", name: "Processors" },
  { id: "system", name: "System devices" },
  { id: "usb", name: "Universal Serial Bus controllers" },
];

export const ERROR_TEXT = {
  10: "This device cannot start. (Code 10)",
  22: "This device is disabled. (Code 22)",
  43: "Doors has stopped this device because it has reported problems. (Code 43)",
};

const driver = (provider, version, date, signer, previous = null) => ({
  provider,
  version,
  date,
  signer,
  previous,
});

const previous = (provider, version, date, signer) => ({ provider, version, date, signer });

const nadir = (version = "10.0.22621.1", date = "05/05/2022") =>
  driver("Nadir", version, date, "Nadir Doors");

const device = (id, classId, name, manufacturer, location, extra = {}) => ({
  id,
  classId,
  name,
  manufacturer,
  location,
  status: "ok",
  ...extra,
});

export const DEVICES = [
  device("dev_audio_0", "audio", "Realtek High Definition Audio", "Realtek Semiconductor Corp.", "PCI bus 0, device 31, function 3", {
    status: "problem",
    code: 10,
    service: "RTKVHD64",
    hardwareId: "HDAUDIO\\FUNC_01&VEN_10EC&DEV_0897&SUBSYS_10438690&REV_1004",
    instance: "HDAUDIO\\FUNC_01&VEN_10EC&DEV_0897&SUBSYS_10438690&REV_1004\\4&2F7A1B3&0&0001",
    driver: driver("Realtek Semiconductor Corp.", "6.0.9231.1", "12/05/2022", "Nadir Doors Hardware Compatibility Publisher",
      previous("Realtek Semiconductor Corp.", "6.0.9106.1", "15/11/2021", "Nadir Doors Hardware Compatibility Publisher")),
    files: ["C:\\Windows\\System32\\drivers\\RTKVHD64.sys", "C:\\Windows\\System32\\RtNicProp64.dll", "C:\\Windows\\System32\\drivers\\hdaudbus.sys"],
  }),
  device("dev_audio_1", "audio", "Microphone Array (Realtek Audio)", "Realtek Semiconductor Corp.", "Internal audio input", {
    service: "RTKVHD64",
    hardwareId: "MMDEVAPI\\{0.0.1.00000000}.{9C4A51B2-77E8-4F2A-8D24-10C2F1B6A901}",
    instance: "SWD\\MMDEVAPI\\{0.0.1.00000000}.{9C4A51B2-77E8-4F2A-8D24-10C2F1B6A901}",
    driver: driver("Nadir", "10.0.22621.1", "05/05/2022", "Nadir Doors"),
  }),

  device("dev_battery_0", "batteries", "Nadir AC Adapter", "Nadir", "Internal power supply", {
    service: "CmBatt",
    hardwareId: "ACPI\\ACPI0003",
    instance: "ACPI\\ACPI0003\\2&DABA3FF&0",
    driver: nadir(),
  }),
  device("dev_battery_1", "batteries", "Nadir ACPI-Compliant Control Method Battery", "Nadir", "Internal battery", {
    service: "CmBatt",
    hardwareId: "ACPI\\PNP0C0A",
    instance: "ACPI\\PNP0C0A\\1",
    driver: nadir(),
  }),

  device("dev_display_0", "display", "Intel(R) UHD Graphics 630", "Intel Corporation", "PCI bus 0, device 2, function 0", {
    service: "igfx",
    hardwareId: "PCI\\VEN_8086&DEV_3E9B&SUBSYS_86941043&REV_00",
    instance: "PCI\\VEN_8086&DEV_3E9B&SUBSYS_86941043&REV_00\\3&11583659&0&10",
    driver: driver("Intel Corporation", "31.0.101.2130", "15/02/2023", "Nadir Doors Hardware Compatibility Publisher",
      previous("Intel Corporation", "30.0.101.1999", "08/11/2022", "Nadir Doors Hardware Compatibility Publisher")),
    files: ["C:\\Windows\\System32\\drivers\\igdkmd64.sys", "C:\\Windows\\System32\\igc64.dll", "C:\\Windows\\System32\\DriverStore\\FileRepository\\iigd_dch.inf"],
  }),

  device("dev_firmware_0", "firmware", "System Firmware", "Nadir", "Motherboard resources", {
    service: "UEFI",
    hardwareId: "UEFI\\FIRMWARE\\1.0.12",
    instance: "UEFI\\FIRMWARE\\1.0.12\\0",
    driver: nadir("1.0.12", "02/02/2023"),
  }),

  device("dev_hid_0", "hid", "HID-compliant consumer control device", "Nadir", "On Intel(R) Serial IO I2C Host Controller", {
    service: "HidUsb",
    hardwareId: "HID\\VID_04F3&PID_31B9&REV_0100&MI_00",
    instance: "HID\\VID_04F3&PID_31B9&REV_0100&MI_00\\7&2C3F1A6&0&0000",
    driver: nadir(),
  }),
  device("dev_hid_1", "hid", "USB Input Device", "Nadir", "Port_#0003.Hub_#0001", {
    service: "HidUsb",
    hardwareId: "USB\\VID_046D&PID_C31C&REV_3301",
    instance: "USB\\VID_046D&PID_C31C&REV_3301\\6&1E2C6A8B&0&3",
    driver: nadir(),
  }),

  device("dev_keyboard_0", "keyboards", "HID Keyboard Device", "Nadir", "Port_#0004.Hub_#0001", {
    service: "kbdhid",
    hardwareId: "HID\\VID_046D&PID_C31C&REV_3301&MI_00",
    instance: "HID\\VID_046D&PID_C31C&REV_3301&MI_00\\7&2A4E6C1D&0&0000",
    driver: nadir(),
  }),
  device("dev_keyboard_1", "keyboards", "Standard PS/2 Keyboard", "Nadir", "Internal keyboard", {
    service: "i8042prt",
    hardwareId: "ACPI\\PNP0303",
    instance: "ACPI\\PNP0303\\4&2B9C0F1&0",
    driver: nadir(),
  }),

  device("dev_mouse_0", "mice", "HID-compliant mouse", "Nadir", "Port_#0004.Hub_#0001", {
    service: "mouhid",
    hardwareId: "HID\\VID_046D&PID_C31C&REV_3301&MI_01",
    instance: "HID\\VID_046D&PID_C31C&REV_3301&MI_01\\7&1B5D2C7A&0&0001",
    driver: nadir(),
  }),

  device("dev_monitor_0", "monitors", "Generic PnP Monitor", "(Standard monitor types)", "Display adapter 0", {
    service: "monitor",
    hardwareId: "MONITOR\\HWP3190",
    instance: "DISPLAY\\HWP3190\\5&2F1A7C3D&0&UID4353",
    driver: nadir("10.0.22621.1", "05/05/2022"),
  }),

  device("dev_net_0", "network", "Intel(R) Ethernet Connection I219-LM", "Intel Corporation", "PCI bus 0, device 31, function 6", {
    service: "e1i68x64",
    hardwareId: "PCI\\VEN_8086&DEV_A0B9&SUBSYS_86941043&REV_00",
    instance: "PCI\\VEN_8086&DEV_A0B9&SUBSYS_86941043&REV_00\\3&11583659&0&FE",
    driver: driver("Intel Corporation", "12.19.2.5", "22/09/2022", "Nadir Doors Hardware Compatibility Publisher",
      previous("Intel Corporation", "12.18.9.9", "10/01/2022", "Nadir Doors Hardware Compatibility Publisher")),
    files: ["C:\\Windows\\System32\\drivers\\e1i68x64.sys", "C:\\Windows\\System32\\e1i68x64.dll", "C:\\Windows\\System32\\DriverStore\\FileRepository\\e1i68x64.inf"],
  }),
  device("dev_net_1", "network", "Intel(R) Wi-Fi 6 AX201 160MHz", "Intel Corporation", "PCI bus 0, device 20, function 3", {
    status: "problem",
    code: 43,
    service: "Netwtw10",
    hardwareId: "PCI\\VEN_8086&DEV_A0F0&SUBSYS_00748086&REV_20",
    instance: "PCI\\VEN_8086&DEV_A0F0&SUBSYS_00748086&REV_20\\3&11583659&0&A0",
    driver: driver("Intel Corporation", "22.230.0.3", "01/08/2023", "Nadir Doors Hardware Compatibility Publisher",
      previous("Intel Corporation", "22.180.0.4", "14/02/2023", "Nadir Doors Hardware Compatibility Publisher")),
    files: ["C:\\Windows\\System32\\drivers\\Netwtw10.sys", "C:\\Windows\\System32\\Netwtw10CoInst.dll", "C:\\Windows\\System32\\DriverStore\\FileRepository\\netwtw10.inf"],
  }),

  device("dev_print_0", "print", "HP LaserJet M404 - Floor 3", "HP", "\\\\PRINT01\\HP-Floor3", {
    service: "hpm404",
    hardwareId: "PRINTER\\HP_LASERJET_M404",
    instance: "SWD\\PRINTENUM\\{8B1C2C61-9F49-4F4B-B4E0-3F361A2E8A11}",
    driver: driver("HP", "61.300.1.197", "14/03/2022", "Nadir Doors Hardware Compatibility Publisher",
      previous("HP", "61.290.1.180", "07/09/2021", "Nadir Doors Hardware Compatibility Publisher")),
    files: ["C:\\Windows\\System32\\spool\\drivers\\x64\\3\\hpm404.dll", "C:\\Windows\\System32\\spool\\drivers\\x64\\3\\hpm404ui.dll"],
  }),
  device("dev_print_1", "print", "Nadir Print to PDF", "Nadir", "PORTPROMPT:", {
    service: "print",
    hardwareId: "PRINTER\\NADIR_PRINT_TO_PDF",
    instance: "SWD\\PRINTENUM\\{0F5D4A31-2A97-4A5F-8C32-67C01A1D2B22}",
    driver: nadir("10.0.22621.1", "05/05/2022"),
  }),

  device("dev_cpu_0", "processors", "Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz", "Intel Corporation", "Socket 1200", {
    service: "intelppm",
    hardwareId: "ACPI\\GenuineIntel_-_Intel64_Family_6_Model_165",
    instance: "ACPI\\GenuineIntel_-_Intel64_Family_6_Model_165\\_0",
    driver: nadir("10.0.22621.1", "05/05/2022"),
  }),

  device("dev_system_0", "system", "Intel(R) SMBus Controller", "Intel Corporation", "PCI bus 0, device 31, function 4", {
    service: "iaLPSS2i_I2C",
    hardwareId: "PCI\\VEN_8086&DEV_A323&SUBSYS_86941043&REV_00",
    instance: "PCI\\VEN_8086&DEV_A323&SUBSYS_86941043&REV_00\\3&11583659&0&FC",
    driver: nadir(),
  }),
  device("dev_system_1", "system", "PCI Express Root Complex", "Nadir", "Motherboard resources", {
    service: "pci",
    hardwareId: "ACPI\\PNP0A08",
    instance: "ACPI\\PNP0A08\\0",
    driver: nadir(),
  }),
  device("dev_system_2", "system", "Trusted Platform Module 2.0", "Nadir", "Motherboard resources", {
    service: "tpm",
    hardwareId: "ACPI\\MSFT0101",
    instance: "ACPI\\MSFT0101\\1",
    driver: nadir("10.0.22621.1", "05/05/2022"),
  }),

  device("dev_usb_0", "usb", "Intel(R) USB 3.1 eXtensible Host Controller", "Intel Corporation", "PCI bus 0, device 20, function 0", {
    service: "USBXHCI",
    hardwareId: "PCI\\VEN_8086&DEV_A36D&SUBSYS_86941043&REV_10",
    instance: "PCI\\VEN_8086&DEV_A36D&SUBSYS_86941043&REV_10\\3&11583659&0&A0",
    driver: nadir("10.0.22621.1", "05/05/2022"),
  }),
  device("dev_usb_1", "usb", "USB Composite Device", "Nadir", "Port_#0004.Hub_#0001", {
    service: "usbccgp",
    hardwareId: "USB\\VID_046D&PID_C31C&REV_3301",
    instance: "USB\\VID_046D&PID_C31C&REV_3301\\6&1E2C6A8B&0&4",
    driver: nadir(),
  }),
  device("dev_usb_2", "usb", "USB Root Hub (USB 3.0)", "Nadir", "On Intel(R) USB 3.1 eXtensible Host Controller", {
    service: "USBHUB3",
    hardwareId: "USB\\ROOT_HUB30&VID_8086&PID_A36D",
    instance: "USB\\ROOT_HUB30&VID_8086&PID_A36D\\6&1E2C6A8B&0&0",
    driver: nadir(),
  }),
];

const CPU_BY_TIER = {
  1: "Intel(R) Core(TM) i3-8100 CPU @ 3.60GHz",
  2: "Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz",
  3: "Intel(R) Core(TM) i7-12700 CPU @ 2.10GHz",
};

export const cpuName = (tier) => CPU_BY_TIER[tier] || CPU_BY_TIER[2];

export const classNameFor = (classId) => CLASSES.find((entry) => entry.id === classId)?.name || "Unknown device";

export function statusText(deviceRecord) {
  if (deviceRecord.status === "disabled") return ERROR_TEXT[22];
  if (deviceRecord.status === "problem") return ERROR_TEXT[deviceRecord.code] || "This device has a problem.";
  return "This device is working properly.";
}

export function statusLabel(deviceRecord) {
  if (deviceRecord.status === "disabled") return "Disabled";
  if (deviceRecord.status === "problem") return `Error ${deviceRecord.code}`;
  return "OK";
}

export function canRollBack(deviceRecord) {
  return !deviceRecord.driver.rolledBack && Boolean(deviceRecord.driver.previous);
}

export const DETAIL_PROPERTIES = [
  ["description", "Device description"],
  ["hardwareIds", "Hardware Ids"],
  ["driverVersion", "Driver version"],
  ["driverDate", "Driver date"],
  ["driverProvider", "Driver provider"],
  ["problemCode", "Problem code"],
  ["instancePath", "Device instance path"],
  ["location", "Location information"],
  ["service", "Service"],
];

export function propertyValue(deviceRecord, key) {
  switch (key) {
    case "description":
      return deviceRecord.name;
    case "hardwareIds":
      return `${deviceRecord.hardwareId}\n${deviceRecord.hardwareId}&REV_00`;
    case "driverVersion":
      return deviceRecord.driver.version;
    case "driverDate":
      return deviceRecord.driver.date;
    case "driverProvider":
      return deviceRecord.driver.provider;
    case "problemCode":
      return deviceRecord.status === "disabled" ? "22" : deviceRecord.status === "problem" ? String(deviceRecord.code) : "0";
    case "instancePath":
      return deviceRecord.instance;
    case "location":
      return deviceRecord.location;
    case "service":
      return deviceRecord.service || "Not available";
    default:
      return "Not available";
  }
}

const DRIVER_FILES = {
  audio: ["C:\\Windows\\System32\\drivers\\RTKVHD64.sys", "C:\\Windows\\System32\\RtNicProp64.dll"],
  display: ["C:\\Windows\\System32\\drivers\\igdkmd64.sys", "C:\\Windows\\System32\\igc64.dll"],
  network: ["C:\\Windows\\System32\\drivers\\Netwtw10.sys", "C:\\Windows\\System32\\Netwtw10CoInst.dll"],
  print: ["C:\\Windows\\System32\\spool\\drivers\\x64\\3\\hpm404.dll", "C:\\Windows\\System32\\spool\\drivers\\x64\\3\\hpm404ui.dll"],
  usb: ["C:\\Windows\\System32\\drivers\\USBXHCI.sys", "C:\\Windows\\System32\\drivers\\usbhub3.sys"],
};

export function driverFiles(deviceRecord) {
  const base = deviceRecord.files || DRIVER_FILES[deviceRecord.classId] || [
    `C:\\Windows\\System32\\drivers\\${deviceRecord.service || "nadir"}.sys`,
  ];
  return [
    ...base,
    `C:\\Windows\\System32\\DriverStore\\FileRepository\\${(deviceRecord.service || "driver").toLowerCase()}.inf`,
  ];
}
