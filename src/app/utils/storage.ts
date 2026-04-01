export type Currency = "CHF" | "EUR" | "USD" | "GBP";

export interface Building {
  id: string;
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  monthlyRevenue: number;
  imageUrl?: string;
  currency?: Currency; // defaults to base currency if undefined
}

export interface ExchangeRateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

export type TenantStatus = "active" | "pending" | "ended";
export type TenantGender = "male" | "female" | "unspecified";

export interface TenantNote {
  id: string;
  tenantId: string;
  date: string; // ISO string
  text: string;
}

export type TenantDocumentType =
  | "Assurance ménage"
  | "Contrat de bail"
  | "Carte d'identité"
  | "Casier des poursuites"
  | "Fiches salaires"
  | "Communication"
  | "Autre";

export interface TenantDocument {
  id: string;
  tenantId: string;
  type: TenantDocumentType;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string; // ISO string
  // Stockage simple (local) : base64 optionnel
  dataUrl?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  buildingId: string;
  buildingName: string;
  unit: string;

  // ✅ Nouveau modèle CHF
  rentNet: number; // CHF
  charges: number; // CHF

  leaseStart: string; // yyyy-mm-dd
  leaseEnd?: string; // ✅ optionnel (peut être vide)

  status: TenantStatus;

  // ✅ Genre
  gender: TenantGender;

  // ✅ Suivi paiement
  paymentStatus?: "up-to-date" | "late" | "very-late"; // défaut: up-to-date
  latePaymentMonths?: number; // nombre de mois en retard
  lastPaymentDate?: string;   // yyyy-mm-dd
}

export type NotificationCategory = "general" | "maintenance" | "payment" | "inspection" | "urgent";

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  buildingId?: string;
  recipientId?: string;
  category?: NotificationCategory;
}

export type MaintenanceStatus = "pending" | "in-progress" | "completed";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type RequestType = "technical" | "administrative" | "rental";

export interface TenantAbsence {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  comment?: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  unit: string;
  tenantId: string;
  tenantName: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: string;
  updatedAt?: string;
  
  // Nouveaux champs pour l'espace locataire
  category?: string;
  requestType?: RequestType;
  dateObserved?: string;
  photos?: string[];
}

// ✅ Actions / TODO bâtiment (chronologique / importance)
export type BuildingActionPriority = "low" | "medium" | "high";
export type BuildingActionStatus = "open" | "done";

export interface BuildingAction {
  id: string;
  buildingId: string;
  title: string;
  description?: string;
  priority: BuildingActionPriority;
  status: BuildingActionStatus;
  dueDate?: string; // yyyy-mm-dd (optionnel)
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ✅ Calendar Events
export type CalendarEventType = "visit" | "inspection" | "signing" | "meeting" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // yyyy-mm-dd
  startTime: string;  // HH:mm
  endTime?: string;    // HH:mm
  type: CalendarEventType;
  buildingId?: string;
  notes?: string;
  createdAt: string;
}

// ✅ Accounting Transactions
export type AccountCategory =
  | 101 | 102 | 103 | 104 | 105 | 106
  | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209 | 210 | 211 | 212 | 213 | 214 | 215 | 216 | 217 | 218
  | 301 | 302 | 401;

export interface AccountingTransaction {
  id: string;
  buildingId: string;
  dateInvoice: string;      // yyyy-mm-dd
  datePayment?: string;     // yyyy-mm-dd
  unit?: string;            // "2ème / 4.5p", "Garage N*6", "Immeuble"
  description: string;
  category: string;         // "Loyers", "Acompte de charges", "Entretien", etc.
  subCategory?: string;
  accountNumber: number;    // 101, 202, etc.
  debit: number;            // CHF spent
  credit: number;           // CHF received
  status?: string;          // "Payé", "", etc.
  tenantName?: string;      // extracted or manual
  month?: string;           // "2026-01" for rent tracking
}

export interface AccountingSettings {
  units: string[];          // "1er / 4.5p", "2ème / 3.5p", "Garage N*1", etc.
  categories: string[];     // "Loyers", "Acompte de charges", "Entretien", etc.
  subCategories: string[];  // "Robinetterie", "Peinture", "Vitres", etc.
}

export interface ManualAdjustment {
  id: string;
  buildingId: string;
  accountNumber: number;
  label: string;
  amount: number;           // positive = add to debit/credit as appropriate
  type: "debit" | "credit";
  createdAt: string;
}

// ✅ Rental Applications (Demandes de location)
export type RentalApplicationStatus = "received" | "under-review" | "accepted" | "rejected";

export interface RentalApplication {
  id: string;
  buildingId: string;
  buildingName: string;
  desiredUnit: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  currentAddress: string;
  desiredMoveIn: string; // yyyy-mm-dd
  monthlyIncome: number;
  householdSize: number;
  occupation: string;
  employer: string;
  message: string;
  status: RentalApplicationStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ------------------------
// Keys
// ------------------------
const LS_KEYS = {
  buildings: "buildings",
  tenants: "tenants",
  notifications: "notifications",
  maintenanceRequests: "maintenanceRequests",
  tenantNotes: "tenantNotes",
  tenantDocuments: "tenantDocuments",
  buildingActions: "buildingActions",
  tenantAbsences: "tenantAbsences",
  rentalApplications: "rentalApplications",
  accountingTransactions: "immostore_accountingTx",
  manualAdjustments: "immostore_manualAdj",
  accountingSettings: "immostore_accountingSettings",
  calendarEvents: "immostore_calendarEvents",
  baseCurrency: "immostore_baseCurrency",
  exchangeRates: "immostore_exchangeRates",
} as const;

// ------------------------
// Helpers
// ------------------------
const safeParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const nowISO = () => new Date().toISOString();

const migrateTenants = (tenants: any[]): Tenant[] => {
  return (tenants ?? []).map((t) => {
    const rentNet =
      Number(t.rentNet ?? t.rent ?? 0) || 0; // compat ancien "rent"
    const charges = Number(t.charges ?? 0) || 0;

    const leaseEnd =
      typeof t.leaseEnd === "string" && t.leaseEnd.length > 0 ? t.leaseEnd : "";

    const gender: TenantGender =
      t.gender === "male" || t.gender === "female" || t.gender === "unspecified"
        ? t.gender
        : "unspecified";

    const status: TenantStatus =
      t.status === "active" || t.status === "pending" || t.status === "ended"
        ? t.status
        : "active";

    return {
      id: String(t.id),
      name: String(t.name ?? ""),
      email: String(t.email ?? ""),
      phone: String(t.phone ?? ""),
      buildingId: String(t.buildingId ?? ""),
      buildingName: String(t.buildingName ?? ""),
      unit: String(t.unit ?? ""),
      rentNet,
      charges,
      leaseStart: String(t.leaseStart ?? ""),
      leaseEnd: leaseEnd || undefined, // ✅ optionnel
      status,
      gender,
    };
  });
};

const initializeDefaultData = () => {
  // Buildings
  if (!localStorage.getItem(LS_KEYS.buildings)) {
    const defaultBuildings: Building[] = [
      {
        id: "1",
        name: "Résidence Bellevue",
        address: "123 Rue de la Paix, Montréal",
        units: 24,
        occupiedUnits: 22,
        monthlyRevenue: 28800,
      },
      {
        id: "2",
        name: "Le Château",
        address: "456 Avenue des Érables, Québec",
        units: 18,
        occupiedUnits: 18,
        monthlyRevenue: 25200,
      },
      {
        id: "3",
        name: "Les Jardins du Parc",
        address: "789 Boulevard Saint-Laurent, Laval",
        units: 32,
        occupiedUnits: 28,
        monthlyRevenue: 36400,
      },
    ];
    localStorage.setItem(LS_KEYS.buildings, JSON.stringify(defaultBuildings));
  }

  // Tenants (avec migration compat)
  const existingTenantsRaw = localStorage.getItem(LS_KEYS.tenants);
  if (!existingTenantsRaw) {
    const defaultTenants: Tenant[] = [
      {
        id: "1",
        name: "Dylan Tremblay",
        email: "dylan@locataire.com",
        phone: "514-555-0101",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        unit: "301",
        rentNet: 1200,
        charges: 0,
        leaseStart: "2024-01-01",
        leaseEnd: "2025-12-31",
        status: "active",
        gender: "male",
      },
      {
        id: "2",
        name: "Sophie Martin",
        email: "sophie.martin@email.com",
        phone: "514-555-0102",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        unit: "205",
        rentNet: 1350,
        charges: 0,
        leaseStart: "2024-03-01",
        leaseEnd: "2025-02-28",
        status: "active",
        gender: "female",
      },
      {
        id: "3",
        name: "Marc Dubois",
        email: "marc.dubois@email.com",
        phone: "514-555-0103",
        buildingId: "2",
        buildingName: "Le Château",
        unit: "102",
        rentNet: 1400,
        charges: 0,
        leaseStart: "2023-09-01",
        leaseEnd: "2025-08-31",
        status: "active",
        gender: "unspecified",
      },
    ];
    localStorage.setItem(LS_KEYS.tenants, JSON.stringify(defaultTenants));
  } else {
    const parsed = safeParse<any[]>(existingTenantsRaw, []);
    const migrated = migrateTenants(parsed);
    localStorage.setItem(LS_KEYS.tenants, JSON.stringify(migrated));
  }

  // Notifications
  if (!localStorage.getItem(LS_KEYS.notifications)) {
    const defaultNotifications: Notification[] = [
      {
        id: "1",
        title: "Réparation de la porte d'entrée",
        message: "Bonjour Dylan, la porte d'entrée du bâtiment a été réparée.",
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        read: false,
        buildingId: "1",
        recipientId: "1",
      },
      {
        id: "2",
        title: "Inspection annuelle",
        message:
          "Une inspection annuelle de votre unité aura lieu le 15 février. Merci de vous assurer que quelqu'un soit présent.",
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        read: false,
        buildingId: "1",
        recipientId: "1",
      },
      {
        id: "3",
        title: "Augmentation du loyer",
        message:
          "Nous vous informons que le loyer sera augmenté de 2% à partir du 1er juillet 2026, conformément à la réglementation.",
        date: new Date(Date.now() - 86400000 * 10).toISOString(),
        read: true,
        buildingId: "2",
        recipientId: "3",
      },
    ];
    localStorage.setItem(
      LS_KEYS.notifications,
      JSON.stringify(defaultNotifications),
    );
  }

  // Maintenance
  if (!localStorage.getItem(LS_KEYS.maintenanceRequests)) {
    const defaultRequests: MaintenanceRequest[] = [
      {
        id: "1",
        title: "Robinet qui fuit à la cuisine",
        description:
          "Le robinet de la cuisine fuit depuis hier. L'eau coule continuellement même quand il est fermé.",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        unit: "301",
        tenantId: "1",
        tenantName: "Dylan Tremblay",
        status: "pending",
        priority: "high",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "2",
        title: "Problème de chauffage",
        description: "Le radiateur de la chambre principale ne chauffe plus.",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        unit: "205",
        tenantId: "2",
        tenantName: "Sophie Martin",
        status: "in-progress",
        priority: "high",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "3",
        title: "Ampoule grillée dans le couloir",
        description: "L'ampoule du couloir principal est grillée.",
        buildingId: "2",
        buildingName: "Le Château",
        unit: "102",
        tenantId: "3",
        tenantName: "Marc Dubois",
        status: "completed",
        priority: "low",
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];
    localStorage.setItem(
      LS_KEYS.maintenanceRequests,
      JSON.stringify(defaultRequests),
    );
  }

  // ✅ Tenant notes
  if (!localStorage.getItem(LS_KEYS.tenantNotes)) {
    localStorage.setItem(LS_KEYS.tenantNotes, JSON.stringify([] as TenantNote[]));
  }

  // ✅ Tenant documents
  if (!localStorage.getItem(LS_KEYS.tenantDocuments)) {
    localStorage.setItem(
      LS_KEYS.tenantDocuments,
      JSON.stringify([] as TenantDocument[]),
    );
  }

  // ✅ Building actions
  if (!localStorage.getItem(LS_KEYS.buildingActions)) {
    const defaults: BuildingAction[] = [
      {
        id: "a1",
        buildingId: "1",
        title: "Planifier contrôle annuel chauffage",
        description: "Contacter entreprise et fixer un créneau",
        priority: "medium",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: "a2",
        buildingId: "2",
        title: "Vérifier assurance immeuble",
        description: "Comparer primes et franchises avant échéance",
        priority: "low",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      },
    ];
    localStorage.setItem(LS_KEYS.buildingActions, JSON.stringify(defaults));
  }
};

// ✅ Absences
export const getTenantAbsences = (): TenantAbsence[] => {
  return safeParse<TenantAbsence[]>(localStorage.getItem(LS_KEYS.tenantAbsences), []);
};
export const saveTenantAbsences = (absences: TenantAbsence[]) => {
  localStorage.setItem(LS_KEYS.tenantAbsences, JSON.stringify(absences));
};
export const addTenantAbsence = (absence: Omit<TenantAbsence, "id">) => {
  const absences = getTenantAbsences();
  const newAbsence = { id: `abs-${Date.now()}`, ...absence };
  saveTenantAbsences([...absences, newAbsence]);
  return newAbsence;
};

// ------------------------
// Storage functions
// ------------------------
export const getBuildings = (): Building[] => {
  initializeDefaultData();
  return safeParse<Building[]>(
    localStorage.getItem(LS_KEYS.buildings),
    [],
  );
};

export const saveBuildings = (buildings: Building[]) => {
  localStorage.setItem(LS_KEYS.buildings, JSON.stringify(buildings));
};

export const getTenants = (): Tenant[] => {
  initializeDefaultData();
  const raw = localStorage.getItem(LS_KEYS.tenants);
  const parsed = safeParse<any[]>(raw, []);
  const migrated = migrateTenants(parsed);
  // garde la DB clean si anciens champs
  localStorage.setItem(LS_KEYS.tenants, JSON.stringify(migrated));
  return migrated;
};

export const saveTenants = (tenants: Tenant[]) => {
  // ✅ on normalize avant save
  const normalized = migrateTenants(tenants as any);
  localStorage.setItem(LS_KEYS.tenants, JSON.stringify(normalized));
};

export const getNotifications = (): Notification[] => {
  initializeDefaultData();
  return safeParse<Notification[]>(
    localStorage.getItem(LS_KEYS.notifications),
    [],
  );
};

export const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(LS_KEYS.notifications, JSON.stringify(notifications));
};

export const getMaintenanceRequests = (): MaintenanceRequest[] => {
  initializeDefaultData();
  return safeParse<MaintenanceRequest[]>(
    localStorage.getItem(LS_KEYS.maintenanceRequests),
    [],
  );
};

export const saveMaintenanceRequests = (requests: MaintenanceRequest[]) => {
  localStorage.setItem(
    LS_KEYS.maintenanceRequests,
    JSON.stringify(requests),
  );
};

// ✅ Tenant notes
export const getTenantNotes = (): TenantNote[] => {
  initializeDefaultData();
  return safeParse<TenantNote[]>(
    localStorage.getItem(LS_KEYS.tenantNotes),
    [],
  );
};

export const saveTenantNotes = (notes: TenantNote[]) => {
  localStorage.setItem(LS_KEYS.tenantNotes, JSON.stringify(notes));
};

export const addTenantNote = (tenantId: string, text: string) => {
  const notes = getTenantNotes();
  const newNote: TenantNote = {
    id: `${Date.now()}`,
    tenantId,
    date: nowISO(),
    text,
  };
  saveTenantNotes([newNote, ...notes]);
  return newNote;
};

// ✅ Tenant documents
export const getTenantDocuments = (): TenantDocument[] => {
  initializeDefaultData();
  return safeParse<TenantDocument[]>(
    localStorage.getItem(LS_KEYS.tenantDocuments),
    [],
  );
};

export const saveTenantDocuments = (docs: TenantDocument[]) => {
  localStorage.setItem(LS_KEYS.tenantDocuments, JSON.stringify(docs));
};

export const addTenantDocument = (doc: Omit<TenantDocument, "id" | "createdAt">) => {
  const docs = getTenantDocuments();
  const newDoc: TenantDocument = {
    id: `${Date.now()}`,
    createdAt: nowISO(),
    ...doc,
  };
  saveTenantDocuments([newDoc, ...docs]);
  return newDoc;
};

export const deleteTenantDocument = (docId: string) => {
  const docs = getTenantDocuments();
  saveTenantDocuments(docs.filter((d) => d.id !== docId));
};

// ✅ Building actions
export const getBuildingActions = (): BuildingAction[] => {
  initializeDefaultData();
  return safeParse<BuildingAction[]>(
    localStorage.getItem(LS_KEYS.buildingActions),
    [],
  );
};

export const saveBuildingActions = (actions: BuildingAction[]) => {
  localStorage.setItem(LS_KEYS.buildingActions, JSON.stringify(actions));
};

export const addBuildingAction = (
  action: Omit<BuildingAction, "id" | "createdAt" | "updatedAt">,
) => {
  const actions = getBuildingActions();
  const newAction: BuildingAction = {
    id: `${Date.now()}`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...action,
  };
  saveBuildingActions([newAction, ...actions]);
  return newAction;
};

export const updateBuildingAction = (updated: BuildingAction) => {
  const actions = getBuildingActions();
  const next = actions.map((a) =>
    a.id === updated.id ? { ...updated, updatedAt: nowISO() } : a,
  );
  saveBuildingActions(next);
};

export const deleteBuildingAction = (id: string) => {
  const actions = getBuildingActions();
  saveBuildingActions(actions.filter((a) => a.id !== id));
};

// ✅ Rental Applications
export const getRentalApplications = (): RentalApplication[] => {
  const raw = localStorage.getItem(LS_KEYS.rentalApplications);
  if (!raw) {
    // Initialize with sample data
    const defaults: RentalApplication[] = [
      {
        id: "ra1",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        desiredUnit: "401",
        applicantName: "Alice Fontaine",
        applicantEmail: "alice.fontaine@email.com",
        applicantPhone: "+41 76 123 45 67",
        currentAddress: "12 Rue du Lac, 1003 Lausanne",
        desiredMoveIn: "2026-05-01",
        monthlyIncome: 7200,
        householdSize: 2,
        occupation: "Ingénieure logiciel",
        employer: "TechCorp SA",
        message: "Nous sommes un couple sans animaux, très intéressés par cet appartement proche de notre lieu de travail.",
        status: "received",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "ra2",
        buildingId: "2",
        buildingName: "Le Château",
        desiredUnit: "203",
        applicantName: "Pierre Morel",
        applicantEmail: "pierre.morel@email.com",
        applicantPhone: "+41 79 987 65 43",
        currentAddress: "45 Avenue de la Gare, 1001 Lausanne",
        desiredMoveIn: "2026-06-01",
        monthlyIncome: 5800,
        householdSize: 1,
        occupation: "Comptable",
        employer: "FinancePlus Sàrl",
        message: "Je cherche un appartement calme pour une personne. J'ai d'excellentes références de mon propriétaire actuel.",
        status: "under-review",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: "ra3",
        buildingId: "1",
        buildingName: "Résidence Bellevue",
        desiredUnit: "105",
        applicantName: "Famille Keller",
        applicantEmail: "keller.family@email.com",
        applicantPhone: "+41 78 456 78 90",
        currentAddress: "8 Chemin des Vignes, 1009 Pully",
        desiredMoveIn: "2026-04-15",
        monthlyIncome: 9500,
        householdSize: 4,
        occupation: "Directeur commercial",
        employer: "SwissRetail AG",
        message: "Famille de 4 personnes (2 adultes, 2 enfants) cherchant un logement plus spacieux. Nous avons un dossier complet à disposition.",
        status: "accepted",
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
    localStorage.setItem(LS_KEYS.rentalApplications, JSON.stringify(defaults));
    return defaults;
  }
  return safeParse<RentalApplication[]>(raw, []);
};

export const saveRentalApplications = (apps: RentalApplication[]) => {
  localStorage.setItem(LS_KEYS.rentalApplications, JSON.stringify(apps));
};

export const addRentalApplication = (app: Omit<RentalApplication, "id" | "createdAt" | "updatedAt" | "status">) => {
  const apps = getRentalApplications();
  const newApp: RentalApplication = {
    id: `ra-${Date.now()}`,
    status: "received",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...app,
  };
  saveRentalApplications([newApp, ...apps]);
  return newApp;
};

export const updateRentalApplication = (updated: RentalApplication) => {
  const apps = getRentalApplications();
  const next = apps.map((a) =>
    a.id === updated.id ? { ...updated, updatedAt: nowISO() } : a,
  );
  saveRentalApplications(next);
};

export const deleteRentalApplication = (id: string) => {
  const apps = getRentalApplications();
  saveRentalApplications(apps.filter((a) => a.id !== id));
};

// ── Currency helpers ──
export const getBaseCurrency = (): Currency => {
  const stored = localStorage.getItem(LS_KEYS.baseCurrency);
  if (stored === "CHF" || stored === "EUR" || stored === "USD" || stored === "GBP") return stored;
  return "CHF";
};

export const saveBaseCurrency = (c: Currency): void => {
  localStorage.setItem(LS_KEYS.baseCurrency, c);
};

export const getExchangeRateCache = (): ExchangeRateCache | null => {
  const raw = localStorage.getItem(LS_KEYS.exchangeRates);
  return raw ? safeParse<ExchangeRateCache | null>(raw, null) : null;
};

export const saveExchangeRateCache = (cache: ExchangeRateCache): void => {
  localStorage.setItem(LS_KEYS.exchangeRates, JSON.stringify(cache));
};

// ─── Calendar Events ──────────────────────────────────────────

export const getCalendarEvents = (): CalendarEvent[] =>
  safeParse<CalendarEvent[]>(localStorage.getItem(LS_KEYS.calendarEvents), []);

export const saveCalendarEvents = (events: CalendarEvent[]) =>
  localStorage.setItem(LS_KEYS.calendarEvents, JSON.stringify(events));

export const addCalendarEvent = (event: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent => {
  const events = getCalendarEvents();
  const newEvent: CalendarEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowISO(),
    ...event,
  };
  saveCalendarEvents([newEvent, ...events]);
  return newEvent;
};

export const deleteCalendarEvent = (id: string) => {
  const events = getCalendarEvents();
  saveCalendarEvents(events.filter((e) => e.id !== id));
};

// ─── Accounting Transactions ──────────────────────────────────

export const getAccountingTransactions = (buildingId?: string): AccountingTransaction[] => {
  const all = safeParse<AccountingTransaction[]>(localStorage.getItem(LS_KEYS.accountingTransactions), []);
  return buildingId ? all.filter((t) => t.buildingId === buildingId) : all;
};

export const saveAccountingTransactions = (txs: AccountingTransaction[]) =>
  localStorage.setItem(LS_KEYS.accountingTransactions, JSON.stringify(txs));

export const addAccountingTransactions = (txs: Omit<AccountingTransaction, "id">[]): AccountingTransaction[] => {
  const existing = getAccountingTransactions();
  const newTxs = txs.map((tx, i) => ({
    id: `tx-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 6)}`,
    ...tx,
  }));
  saveAccountingTransactions([...existing, ...newTxs]);
  return newTxs;
};

export const deleteAccountingTransactions = (buildingId: string) => {
  const all = getAccountingTransactions();
  saveAccountingTransactions(all.filter((t) => t.buildingId !== buildingId));
};

// ─── Manual Adjustments ───────────────────────────────────────

export const getManualAdjustments = (buildingId?: string): ManualAdjustment[] => {
  const all = safeParse<ManualAdjustment[]>(localStorage.getItem(LS_KEYS.manualAdjustments), []);
  return buildingId ? all.filter((a) => a.buildingId === buildingId) : all;
};

export const saveManualAdjustments = (adjs: ManualAdjustment[]) =>
  localStorage.setItem(LS_KEYS.manualAdjustments, JSON.stringify(adjs));

export const addManualAdjustment = (adj: Omit<ManualAdjustment, "id" | "createdAt">): ManualAdjustment => {
  const all = getManualAdjustments();
  const newAdj: ManualAdjustment = { id: `adj-${Date.now()}`, createdAt: nowISO(), ...adj };
  saveManualAdjustments([...all, newAdj]);
  return newAdj;
};

export const deleteManualAdjustment = (id: string) => {
  const all = getManualAdjustments();
  saveManualAdjustments(all.filter((a) => a.id !== id));
};

// ─── Accounting Settings ──────────────────────────────────────

const DEFAULT_ACCOUNTING_SETTINGS: Record<string, AccountingSettings> = {};

export const getAccountingSettings = (buildingId: string): AccountingSettings => {
  const all = safeParse<Record<string, AccountingSettings>>(
    localStorage.getItem(LS_KEYS.accountingSettings), {}
  );
  return all[buildingId] || { units: [], categories: [], subCategories: [] };
};

export const saveAccountingSettings = (buildingId: string, settings: AccountingSettings) => {
  const all = safeParse<Record<string, AccountingSettings>>(
    localStorage.getItem(LS_KEYS.accountingSettings), {}
  );
  all[buildingId] = settings;
  localStorage.setItem(LS_KEYS.accountingSettings, JSON.stringify(all));
};