export type Language = "fr" | "en" | "de" | "it";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "FR" },
  { code: "en", label: "English", flag: "EN" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "it", label: "Italiano", flag: "IT" },
];

type TranslationSet = {
  // Common
  appName: string;
  admin: string;
  tenant: string;
  save: string;
  cancel: string;
  create: string;
  update: string;
  delete: string;
  add: string;
  edit: string;
  search: string;
  all: string;
  close: string;
  send: string;
  submit: string;
  loading: string;
  noData: string;
  confirm: string;
  yes: string;
  no: string;
  back: string;
  open: string;
  details: string;

  // Auth
  login: string;
  logout: string;
  email: string;
  password: string;
  loginTitle: string;
  loginSubtitle: string;
  loginButton: string;
  loginError: string;
  loginFieldsRequired: string;
  demoAccounts: string;
  allRightsReserved: string;
  loggedInAs: string;

  // Sidebar navigation
  navDashboard: string;
  navBuildings: string;
  navTenants: string;
  navRequests: string;
  navInterventions: string;
  navServices: string;
  navNotifications: string;
  navInformations: string;
  navSettings: string;
  navSupport: string;
  navHome: string;
  navMyRequests: string;

  // Top Header
  searchPlaceholder: string;

  // Dashboard (Admin)
  dashboardTitle: string;
  dashboardSubtitle: string;
  importantInfo: string;
  importantInformation: string;
  kpiTitle: string;
  kpiSubtitle: string;
  liveData: string;
  totalBuildings: string;
  totalUnits: string;
  occupancyRate: string;
  occupiedOf: string;
  monthlyRevenue: string;
  combinedTotal: string;
  pendingRequests: string;
  totalRequests: string;
  actionNeeded: string;
  buildingsPortfolio: string;
  buildingsPortfolioSub: string;
  recentRequests: string;
  recentRequestsSub: string;
  pending: string;
  inProgress: string;
  completed: string;
  submittedBy: string;
  noRequestsYet: string;
  allRequestsHere: string;
  quickStats: string;
  quickStatsSub: string;
  totalProperties: string;
  allOperational: string;
  occupancy: string;
  unitsOccupied: string;
  activeTenants: string;
  acrossProperties: string;

  // Dashboard (Tenant)
  hello: string;
  welcomeTenant: string;
  myBuilding: string;
  monthlyRent: string;
  currentAmount: string;
  waiting: string;
  requests: string;
  ongoing: string;
  leaseInfo: string;
  leaseInfoSub: string;
  unit: string;
  address: string;
  leaseStart: string;
  leaseEnd: string;
  quickActions: string;
  technicalRequest: string;
  technicalRequestDesc: string;
  adminRequest: string;
  adminRequestDesc: string;
  additionalRental: string;
  additionalRentalDesc: string;
  myInfo: string;
  contactManagement: string;
  myAbsences: string;
  reportAbsence: string;
  noAbsences: string;
  startDate: string;
  endDate: string;
  commentOptional: string;

  // Buildings
  buildingsTitle: string;
  buildingsSub: string;
  addBuilding: string;
  editBuilding: string;
  newBuilding: string;
  buildingName: string;
  buildingAddress: string;
  numberOfUnits: string;
  occupiedUnits: string;
  monthlyRevenueLabel: string;
  noBuildings: string;
  startAddBuilding: string;
  occupation: string;
  units: string;
  revenue: string;
  buildingImage: string;
  deleteBuilding: string;
  confirmDeleteBuilding: string;
  addABuilding: string;
  unitsOccupiedOf: string;

  // Tenants
  tenantsTitle: string;
  tenantsSub: string;
  addTenant: string;
  editTenant: string;
  newTenant: string;
  fullName: string;
  phone: string;
  building: string;
  gender: string;
  male: string;
  female: string;
  unspecified: string;
  netRent: string;
  monthlyCharges: string;
  leaseStartLabel: string;
  leaseEndOptional: string;
  status: string;
  active: string;
  ended: string;
  noTenants: string;
  startAddTenant: string;
  allBuildings: string;
  tenantFile: string;
  tenantNotes: string;
  addDateNote: string;
  noteDate: string;
  notePlaceholder: string;
  noNotes: string;
  documents: string;
  category: string;
  file: string;
  noDocuments: string;
  addedOn: string;
  netRentLabel: string;
  chargesLabel: string;
  monthlyTotal: string;
  sendEmail: string;
  confirmDeleteTenant: string;
  selectBuilding: string;

  // Document categories
  docHouseholdInsurance: string;
  docLeaseContract: string;
  docIdCard: string;
  docDebtRecord: string;
  docPayslips: string;
  docCommunication: string;
  docOther: string;

  // Requests
  maintenanceRequests: string;
  myRequestsTitle: string;
  requestsSub: string;
  requestsSubTenant: string;
  newRequest: string;
  requestTitle: string;
  requestDescription: string;
  priority: string;
  low: string;
  medium: string;
  high: string;
  urgent: string;
  noRequests: string;
  noRequestsAdmin: string;
  noRequestsTenant: string;
  noRequestsFilter: string;
  filterAll: string;
  filterPending: string;
  filterInProgress: string;
  filterCompleted: string;
  createdOn: string;
  confirmDeleteRequest: string;

  // Tenant Requests
  manageAllRequests: string;
  allMyRequests: string;
  pendingRequestsLabel: string;
  inProgressRequests: string;
  completedRequests: string;
  newRequestBtn: string;
  requestType: string;
  technical: string;
  administrative: string;
  rental: string;
  technicalLabel: string;
  administrativeLabel: string;
  rentalLabel: string;
  technicalDesc: string;
  administrativeDesc: string;
  rentalDesc: string;
  categoryLabel: string;
  selectCategory: string;
  titleLabel: string;
  titlePlaceholder: string;
  detailedDescription: string;
  descriptionPlaceholder: string;
  urgencyLevel: string;
  dateObserved: string;
  photosOptional: string;
  clickToAddPhotos: string;
  photoFormats: string;
  sendRequest: string;
  fillAllFields: string;
  noRequestsCreate: string;

  // Interventions
  interventionsTitle: string;
  interventionsSub: string;
  newIntervention: string;
  planIntervention: string;
  noInterventions: string;
  selectABuilding: string;
  concernedTenants: string;
  date: string;
  time: string;
  description: string;
  presenceRequired: string;
  infoOnly: string;
  tenantPresenceRequired: string;
  tenantResponses: string;
  present: string;
  absent: string;

  // Services
  servicesTitle: string;
  servicesSub: string;
  premiumPartners: string;
  searchServicePlaceholder: string;
  categories: string;
  allServices: string;
  plumbing: string;
  electrical: string;
  heating: string;
  painting: string;
  generalMaintenance: string;
  hvac: string;
  locksmith: string;
  cleaning: string;
  security: string;
  verified: string;
  available: string;
  responds: string;
  reviews: string;
  result: string;
  results: string;
  noProviders: string;
  tryOtherCriteria: string;
  offeredServices: string;
  contactInfo: string;
  certifications: string;
  call: string;
  requestQuote: string;

  // Notifications
  notificationsTitle: string;
  notificationsSub: string;
  notificationsSubTenant: string;
  newNotification: string;
  notifTitle: string;
  notifMessage: string;
  notifBuilding: string;
  notifRecipient: string;
  allBuildingsOption: string;
  allTenantsOption: string;
  newLabel: string;
  markAsRead: string;
  confirmDeleteNotif: string;
  noNotifications: string;
  noNotifAdmin: string;
  noNotifTenant: string;
  alertTenants: string;
  broadcastTitle: string;
  broadcastSubject: string;
  broadcastMessage: string;
  recipients: string;
  sendToAll: string;
  today: string;
  yesterday: string;
  daysAgo: string;

  // Informations
  informationsTitle: string;
  informationsSub: string;
  infoTenantTitle: string;
  infoTenantSub: string;
  referenceRate: string;
  referenceRateText: string;
  cpiIndexation: string;
  cpiIndexationText: string;
  maintenanceReserves: string;
  maintenanceReservesText: string;
  regulations: string;
  buildingRules: string;
  laundryRules: string;
  wasteRules: string;
  usefulContacts: string;
  managementEmergency: string;
  concierge: string;
  medicalEmergency: string;
  police: string;

  // Profile
  myProfile: string;
  name: string;
  role: string;

  // Info items (dashboard)
  infoReferenceRate: string;
  infoReferenceRateDesc: string;
  infoCpiIndex: string;
  infoCpiIndexDesc: string;
  infoRenewal: string;
  infoRenewalDesc: string;
  infoMaintenance: string;
  infoMaintenanceDesc: string;
  infoInsurance: string;
  infoInsuranceDesc: string;
  infoCharges: string;
  infoChargesDesc: string;
  infoVacancy: string;
  infoVacancyDesc: string;
  infoDocumentation: string;
  infoDocumentationDesc: string;
  infoDisclaimer: string;

  // Tags
  tagSwitzerland: string;
  tagManagement: string;
  tagProcess: string;
  tagExploitation: string;
  tagRisk: string;
  tagFinance: string;
  tagRental: string;
  tagCompliance: string;

  // Tenants redesign
  tenantsOverview: string;
  searchTenants: string;
  tenantCount: string;
  occupancyLabel: string;
  viewProfile: string;
  contactTenant: string;
  addNote: string;
  viewRequests: string;
  viewDocuments: string;
  leaseDetails: string;
  financials: string;
  tenantSince: string;
  leaseEnds: string;
  totalMonthly: string;
  internalNotes: string;
  managementNotes: string;
  writeNote: string;
  noNotesYet: string;
  recentActivity: string;
  noActivity: string;
  openRequests: string;
  closedRequests: string;
  leaving: string;

  // Requests split (rental applications + maintenance)
  requestsHub: string;
  requestsHubSub: string;
  maintenanceTab: string;
  rentalApplicationsTab: string;
  rentalApplications: string;
  rentalApplicationsSub: string;
  newRentalApplication: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  desiredUnit: string;
  desiredMoveIn: string;
  monthlyIncome: string;
  currentAddress: string;
  applicationMessage: string;
  applicationStatus: string;
  received: string;
  underReview: string;
  accepted: string;
  rejected: string;
  noApplications: string;
  noApplicationsSub: string;
  reviewApplication: string;
  applicantInfo: string;
  applicationDetails: string;
  householdSize: string;
  applicantOccupation: string;
  employer: string;
  applicationDate: string;
  approve: string;
  reject: string;
  markUnderReview: string;
  numberOfPersons: string;

  // Send document to tenant
  sendDocument: string;
  sendDocumentTitle: string;
  sendDocumentSub: string;
  docType: string;
  selectFile: string;
  clickToSelectFile: string;
  optionalMessage: string;
  sendDocMessagePlaceholder: string;
  sendToTenant: string;
  docSentNotifTitle: string;
  docSentNotifMessage: string;

  // Dark mode
  lightMode: string;
  darkMode: string;
  theme: string;
};

export const translations: Record<Language, TranslationSet> = {
  fr: {
    appName: "Immostore",
    admin: "Administrateur",
    tenant: "Locataire",
    save: "Enregistrer",
    cancel: "Annuler",
    create: "Créer",
    update: "Mettre à jour",
    delete: "Supprimer",
    add: "Ajouter",
    edit: "Modifier",
    search: "Rechercher",
    all: "Tous",
    close: "Fermer",
    send: "Envoyer",
    submit: "Soumettre",
    loading: "Chargement...",
    noData: "Aucune donnée",
    confirm: "Confirmer",
    yes: "Oui",
    no: "Non",
    back: "Retour",
    open: "Ouvrir",
    details: "Détails",

    login: "Connexion",
    logout: "Déconnexion",
    email: "Email",
    password: "Mot de passe",
    loginTitle: "Connexion",
    loginSubtitle: "Gestion immobilière intelligente",
    loginButton: "Se connecter",
    loginError: "Email ou mot de passe incorrect",
    loginFieldsRequired: "Veuillez remplir tous les champs",
    demoAccounts: "Comptes de démonstration :",
    allRightsReserved: "© 2026 Immostore. Tous droits réservés.",
    loggedInAs: "Connecté en tant que",

    navDashboard: "Tableau de bord",
    navBuildings: "Bâtiments",
    navTenants: "Locataires",
    navRequests: "Demandes",
    navInterventions: "Interventions",
    navServices: "Services",
    navNotifications: "Notifications",
    navInformations: "Informations",
    navSettings: "Paramètres",
    navSupport: "Support",
    navHome: "Accueil",
    navMyRequests: "Mes demandes",

    searchPlaceholder: "Rechercher propriétés, locataires ou demandes...",

    dashboardTitle: "Vue d'ensemble",
    dashboardSubtitle: "Vue complète de votre portefeuille immobilier",
    importantInfo: "Infos importantes",
    importantInformation: "Informations importantes",
    kpiTitle: "Indicateurs clés",
    kpiSubtitle: "Votre portefeuille en un coup d'œil",
    liveData: "Données en direct",
    totalBuildings: "Total bâtiments",
    totalUnits: "unités au total",
    occupancyRate: "Taux d'occupation",
    occupiedOf: "occupées sur",
    monthlyRevenue: "Revenus mensuels",
    combinedTotal: "Total combiné",
    pendingRequests: "Demandes en attente",
    totalRequests: "demandes au total",
    actionNeeded: "Action requise",
    buildingsPortfolio: "Portefeuille immobilier",
    buildingsPortfolioSub: "Gérez et supervisez vos biens",
    recentRequests: "Demandes récentes",
    recentRequestsSub: "Dernières demandes de maintenance",
    pending: "En attente",
    inProgress: "En cours",
    completed: "Terminé",
    submittedBy: "Soumis par",
    noRequestsYet: "Aucune demande",
    allRequestsHere: "Toutes les demandes apparaîtront ici",
    quickStats: "Statistiques rapides",
    quickStatsSub: "Indicateurs de performance",
    totalProperties: "Total propriétés",
    allOperational: "Toutes les propriétés opérationnelles",
    occupancy: "Occupation",
    unitsOccupied: "unités occupées",
    activeTenants: "Locataires actifs",
    acrossProperties: "Dans toutes les propriétés",

    hello: "Bonjour",
    welcomeTenant: "Bienvenue dans votre espace locataire",
    myBuilding: "Mon bâtiment",
    monthlyRent: "Loyer mensuel",
    currentAmount: "Montant actuel",
    waiting: "En attente",
    requests: "Demandes",
    ongoing: "En cours",
    leaseInfo: "Informations de bail",
    leaseInfoSub: "Données de votre location",
    unit: "Unité",
    address: "Adresse",
    leaseStart: "Début du bail",
    leaseEnd: "Fin du bail",
    quickActions: "Actions rapides",
    technicalRequest: "Demande technique",
    technicalRequestDesc: "Signaler un problème ou une panne",
    adminRequest: "Demande administrative",
    adminRequestDesc: "Attestation, résiliation, etc.",
    additionalRental: "Location complémentaire",
    additionalRentalDesc: "Garage, parking, cave...",
    myInfo: "Mes informations",
    contactManagement: "Contacter la gérance",
    myAbsences: "Mes absences",
    reportAbsence: "Signaler",
    noAbsences: "Aucune absence signalée",
    startDate: "Date de début",
    endDate: "Date de fin",
    commentOptional: "Commentaire (optionnel)",

    buildingsTitle: "Bâtiments",
    buildingsSub: "Gérez votre portefeuille immobilier",
    addBuilding: "Ajouter un bâtiment",
    editBuilding: "Modifier le bâtiment",
    newBuilding: "Nouveau bâtiment",
    buildingName: "Nom du bâtiment",
    buildingAddress: "Adresse",
    numberOfUnits: "Nombre d'unités",
    occupiedUnits: "Unités occupées",
    monthlyRevenueLabel: "Revenus mensuels",
    noBuildings: "Aucun bâtiment",
    startAddBuilding: "Commencez par ajouter votre premier bâtiment",
    occupation: "Occupation",
    units: "Unités",
    revenue: "Revenus",
    buildingImage: "Image du bâtiment",
    deleteBuilding: "Supprimer",
    confirmDeleteBuilding: "Êtes-vous sûr de vouloir supprimer ce bâtiment ?",
    addABuilding: "Ajouter un bâtiment",
    unitsOccupiedOf: "Unités occupées",

    tenantsTitle: "Locataires",
    tenantsSub: "Gérez vos locataires",
    addTenant: "Ajouter un locataire",
    editTenant: "Modifier le locataire",
    newTenant: "Nouveau locataire",
    fullName: "Nom complet",
    phone: "Téléphone",
    building: "Bâtiment",
    gender: "Genre",
    male: "Homme",
    female: "Femme",
    unspecified: "Non précisé",
    netRent: "Loyer mensuel net (CHF)",
    monthlyCharges: "Charges mensuelles (CHF)",
    leaseStartLabel: "Début du bail",
    leaseEndOptional: "Fin du bail (optionnel)",
    status: "Statut",
    active: "Actif",
    ended: "Terminé",
    noTenants: "Aucun locataire",
    startAddTenant: "Commencez par ajouter votre premier locataire",
    allBuildings: "Tous les immeubles",
    tenantFile: "Fiche locataire",
    tenantNotes: "Notes",
    addDateNote: "Ajoutez une note datée pour suivre l'historique.",
    noteDate: "Date",
    notePlaceholder: "Ex: Appel avec le locataire, documents reçus, incident, etc.",
    noNotes: "Aucune note pour le moment.",
    documents: "Documents",
    category: "Catégorie",
    file: "Fichier",
    noDocuments: "Aucun document ajouté.",
    addedOn: "Ajouté le",
    netRentLabel: "Loyer net",
    chargesLabel: "Charges",
    monthlyTotal: "Total mensuel",
    sendEmail: "Envoyer un email",
    confirmDeleteTenant: "Êtes-vous sûr de vouloir supprimer ce locataire ?",
    selectBuilding: "Sélectionner un bâtiment",

    docHouseholdInsurance: "Assurance ménage",
    docLeaseContract: "Contrat de bail",
    docIdCard: "Carte d'identité",
    docDebtRecord: "Casier des poursuites",
    docPayslips: "Fiches salaires",
    docCommunication: "Communication",
    docOther: "Autre",

    maintenanceRequests: "Demandes de maintenance",
    myRequestsTitle: "Mes demandes",
    requestsSub: "Gérez les demandes de vos locataires",
    requestsSubTenant: "Soumettez et suivez vos demandes de réparation",
    newRequest: "Nouvelle demande",
    requestTitle: "Titre",
    requestDescription: "Description",
    priority: "Priorité",
    low: "Faible",
    medium: "Moyenne",
    high: "Haute",
    urgent: "Urgente",
    noRequests: "Aucune demande",
    noRequestsAdmin: "Aucune demande de maintenance pour le moment",
    noRequestsTenant: "Vous n'avez soumis aucune demande",
    noRequestsFilter: "Aucune demande",
    filterAll: "Toutes",
    filterPending: "En attente",
    filterInProgress: "En cours",
    filterCompleted: "Terminées",
    createdOn: "Créé le",
    confirmDeleteRequest: "Êtes-vous sûr de vouloir supprimer cette demande ?",

    manageAllRequests: "Gérez toutes vos demandes en un seul endroit",
    allMyRequests: "Toutes mes demandes",
    pendingRequestsLabel: "Demandes en attente",
    inProgressRequests: "Demandes en cours",
    completedRequests: "Demandes terminées",
    newRequestBtn: "Nouvelle demande",
    requestType: "Type de demande",
    technical: "Technique",
    administrative: "Administrative",
    rental: "Location",
    technicalLabel: "Technique",
    administrativeLabel: "Administrative",
    rentalLabel: "Location",
    technicalDesc: "Panne, réparation",
    administrativeDesc: "Documents, démarches",
    rentalDesc: "Garage, parking, cave",
    categoryLabel: "Catégorie",
    selectCategory: "Sélectionnez une catégorie",
    titleLabel: "Titre",
    titlePlaceholder: "Ex: Robinet de cuisine qui fuit",
    detailedDescription: "Description détaillée",
    descriptionPlaceholder: "Décrivez le problème en détail...",
    urgencyLevel: "Niveau d'urgence",
    dateObserved: "Date d'apparition",
    photosOptional: "Photos (optionnel)",
    clickToAddPhotos: "Cliquez pour ajouter des photos",
    photoFormats: "JPG, PNG jusqu'à 10MB",
    sendRequest: "Envoyer la demande",
    fillAllFields: "Veuillez remplir tous les champs obligatoires",
    noRequestsCreate: "Créez votre première demande",

    interventionsTitle: "Interventions planifiées",
    interventionsSub: "Gérez les interventions dans les immeubles",
    newIntervention: "Nouvelle intervention",
    planIntervention: "Planifier une intervention",
    noInterventions: "Aucune intervention planifiée.",
    selectABuilding: "Sélectionner un immeuble",
    concernedTenants: "Locataires concernés",
    date: "Date",
    time: "Heure",
    description: "Description",
    presenceRequired: "Présence requise",
    infoOnly: "Information uniquement",
    tenantPresenceRequired: "Présence du locataire requise",
    tenantResponses: "Réponses des locataires",
    present: "Présent",
    absent: "Absent",

    servicesTitle: "Services Partenaires",
    servicesSub: "Répertoire de prestataires vérifiés pour tous vos besoins",
    premiumPartners: "Partenaires Premium",
    searchServicePlaceholder: "Rechercher un service, une entreprise...",
    categories: "Catégories",
    allServices: "Tous les services",
    plumbing: "Plomberie",
    electrical: "Électricité",
    heating: "Chauffage",
    painting: "Peinture",
    generalMaintenance: "Maintenance générale",
    hvac: "Climatisation",
    locksmith: "Serrurerie",
    cleaning: "Nettoyage",
    security: "Sécurité",
    verified: "Vérifié",
    available: "Disponible",
    responds: "Répond",
    reviews: "avis",
    result: "résultat",
    results: "résultats",
    noProviders: "Aucun prestataire trouvé",
    tryOtherCriteria: "Essayez avec d'autres critères",
    offeredServices: "Services proposés",
    contactInfo: "Coordonnées",
    certifications: "Certifications",
    call: "Appeler",
    requestQuote: "Demander un devis",

    notificationsTitle: "Notifications",
    notificationsSub: "Envoyez des notifications à vos locataires",
    notificationsSubTenant: "Vos notifications",
    newNotification: "Nouvelle notification",
    notifTitle: "Titre",
    notifMessage: "Message",
    notifBuilding: "Bâtiment (optionnel)",
    notifRecipient: "Destinataire (optionnel)",
    allBuildingsOption: "Tous les bâtiments",
    allTenantsOption: "Tous les locataires",
    newLabel: "Nouveau",
    markAsRead: "Marquer comme lu",
    confirmDeleteNotif: "Êtes-vous sûr de vouloir supprimer cette notification ?",
    noNotifications: "Aucune notification",
    noNotifAdmin: "Commencez par envoyer une notification à vos locataires",
    noNotifTenant: "Vous n'avez aucune notification pour le moment",
    alertTenants: "Avertir locataires",
    broadcastTitle: "Avertir les locataires",
    broadcastSubject: "Objet",
    broadcastMessage: "Message",
    recipients: "Destinataires",
    sendToAll: "Envoyer à tous",
    today: "Aujourd'hui",
    yesterday: "Hier",
    daysAgo: "Il y a {n} jours",

    informationsTitle: "Informations",
    informationsSub: "Informations importantes pour la gestion immobilière",
    infoTenantTitle: "Informations de l'immeuble",
    infoTenantSub: "Documents et informations utiles pour votre résidence",
    referenceRate: "Taux hypothécaire de référence",
    referenceRateText: "Le taux hypothécaire de référence est passé de 1.50% à 1.25%. Les locataires peuvent demander une baisse de loyer basée sur leur dernier taux de référence applicable.",
    cpiIndexation: "Indexation IPC",
    cpiIndexationText: "Les loyers peuvent être adaptés selon l'évolution de l'indice suisse des prix à la consommation (IPC) si cela est prévu contractuellement. En pratique, la variation de l'IPC peut être répercutée sur le loyer à hauteur d'environ 40% sur la part supportée par le locataire.",
    maintenanceReserves: "Réserves d'entretien recommandées",
    maintenanceReservesText: "Prévoir entre 0.8% et 1.2% de la valeur du bien par an.",
    regulations: "Règlement",
    buildingRules: "Règlement de l'immeuble (PDF)",
    laundryRules: "Règles d'utilisation de la buanderie (PDF)",
    wasteRules: "Consignes de tri des déchets (PDF)",
    usefulContacts: "Contacts utiles",
    managementEmergency: "Gérance (Urgences)",
    concierge: "Concierge",
    medicalEmergency: "Urgences médicales",
    police: "Police",

    myProfile: "Mon profil",
    name: "Nom",
    role: "Rôle",

    infoReferenceRate: "Taux hypothécaire de référence",
    infoReferenceRateDesc: "Le taux hypothécaire de référence est passé de 1.50% à 1.25%. Des locataires peuvent demander une baisse de loyer selon leur dernière base appliquée et les règles en vigueur.",
    infoCpiIndex: "Indexation IPC",
    infoCpiIndexDesc: "Gardez une trace de la base IPC utilisée lors du dernier ajustement. Toute demande d'augmentation/diminution se calcule par rapport à la même base économique.",
    infoRenewal: "Renouvellement et congés",
    infoRenewalDesc: "Centralisez les échéances des baux (délais de résiliation, options de renouvellement, dates d'entrée/sortie). Programmez des rappels 60/30/15 jours avant les dates clés.",
    infoMaintenance: "Maintenance proactive",
    infoMaintenanceDesc: "Planifiez une inspection périodique: chaudières, ventilation, détecteurs, parties communes. Prévenir coûte souvent moins cher que réparer en urgence.",
    infoInsurance: "Assurances et sinistres",
    infoInsuranceDesc: "Vérifiez couverture bâtiment, RC propriétaire, dégâts d'eau, bris de glace. Documentez les sinistres (photos, dates, devis) pour accélérer le traitement.",
    infoCharges: "Charges et décomptes",
    infoChargesDesc: "Conservez factures, relevés et clés de répartition. Pour limiter les contestations: transparence sur les postes, périodicité cohérente et justificatifs accessibles.",
    infoVacancy: "Vacance et commercialisation",
    infoVacancyDesc: "Préparez un plan vacance: photos, annonce standard, check-list état des lieux, visites. Un délai de relocation réduit l'impact sur le cash-flow.",
    infoDocumentation: "Documentation locataire",
    infoDocumentationDesc: "Standardisez: état des lieux, inventaire, communications importantes, preuves d'envoi. Une bonne traçabilité réduit les litiges.",
    infoDisclaimer: "Ces informations sont indicatives et ne remplacent pas un avis juridique professionnel.",

    tagSwitzerland: "Suisse",
    tagManagement: "Gestion",
    tagProcess: "Process",
    tagExploitation: "Exploitation",
    tagRisk: "Risque",
    tagFinance: "Finance",
    tagRental: "Location",
    tagCompliance: "Conformité",

    tenantsOverview: "Vue d'ensemble de vos locataires par immeuble",
    searchTenants: "Rechercher un locataire...",
    tenantCount: "locataires",
    occupancyLabel: "Occupation",
    viewProfile: "Voir le profil",
    contactTenant: "Contacter",
    addNote: "Ajouter une note",
    viewRequests: "Voir les demandes",
    viewDocuments: "Documents",
    leaseDetails: "Détails du bail",
    financials: "Finances",
    tenantSince: "Locataire depuis",
    leaseEnds: "Fin du bail",
    totalMonthly: "Total mensuel",
    internalNotes: "Notes internes",
    managementNotes: "Notes de gestion et suivi",
    writeNote: "Écrire une note...",
    noNotesYet: "Aucune note pour le moment",
    recentActivity: "Activité récente",
    noActivity: "Aucune activité récente",
    openRequests: "Demandes ouvertes",
    closedRequests: "Demandes fermées",
    leaving: "Départ",

    requestsHub: "Demandes",
    requestsHubSub: "Gérez les demandes de maintenance et les candidatures locatives",
    maintenanceTab: "Maintenance",
    rentalApplicationsTab: "Candidatures",
    rentalApplications: "Demandes de location",
    rentalApplicationsSub: "Gérez les candidatures de futurs locataires",
    newRentalApplication: "Nouvelle candidature",
    applicantName: "Nom du candidat",
    applicantEmail: "Email",
    applicantPhone: "Téléphone",
    desiredUnit: "Unité souhaitée",
    desiredMoveIn: "Date d'emménagement souhaitée",
    monthlyIncome: "Revenu mensuel",
    currentAddress: "Adresse actuelle",
    applicationMessage: "Message de candidature",
    applicationStatus: "Statut de la candidature",
    received: "Reçue",
    underReview: "En examen",
    accepted: "Acceptée",
    rejected: "Refusée",
    noApplications: "Aucune candidature",
    noApplicationsSub: "Les nouvelles candidatures apparaîtront ici",
    reviewApplication: "Examiner la candidature",
    applicantInfo: "Informations du candidat",
    applicationDetails: "Détails de la candidature",
    householdSize: "Taille du ménage",
    applicantOccupation: "Profession",
    employer: "Employeur",
    applicationDate: "Date de candidature",
    approve: "Approuver",
    reject: "Refuser",
    markUnderReview: "Mettre en examen",
    numberOfPersons: "personnes",

    sendDocument: "Envoyer un document",
    sendDocumentTitle: "Envoyer un document",
    sendDocumentSub: "Envoyer un document directement à",
    docType: "Type de document",
    selectFile: "Fichier",
    clickToSelectFile: "Cliquez pour sélectionner un fichier",
    optionalMessage: "Message (optionnel)",
    sendDocMessagePlaceholder: "Ex: Veuillez trouver ci-joint le checklist d'état des lieux...",
    sendToTenant: "Envoyer au locataire",
    docSentNotifTitle: "Document reçu",
    docSentNotifMessage: "Un document vous a été envoyé :",

    lightMode: "Jour",
    darkMode: "Nuit",
    theme: "Thème",
  },

  en: {
    appName: "Immostore",
    admin: "Administrator",
    tenant: "Tenant",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    delete: "Delete",
    add: "Add",
    edit: "Edit",
    search: "Search",
    all: "All",
    close: "Close",
    send: "Send",
    submit: "Submit",
    loading: "Loading...",
    noData: "No data",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    back: "Back",
    open: "Open",
    details: "Details",

    login: "Login",
    logout: "Logout",
    email: "Email",
    password: "Password",
    loginTitle: "Sign In",
    loginSubtitle: "Intelligent property management",
    loginButton: "Sign in",
    loginError: "Incorrect email or password",
    loginFieldsRequired: "Please fill in all fields",
    demoAccounts: "Demo accounts:",
    allRightsReserved: "© 2026 Immostore. All rights reserved.",
    loggedInAs: "Logged in as",

    navDashboard: "Dashboard",
    navBuildings: "Buildings",
    navTenants: "Tenants",
    navRequests: "Requests",
    navInterventions: "Interventions",
    navServices: "Services",
    navNotifications: "Notifications",
    navInformations: "Information",
    navSettings: "Settings",
    navSupport: "Support",
    navHome: "Home",
    navMyRequests: "My Requests",

    searchPlaceholder: "Search properties, tenants, or requests...",

    dashboardTitle: "Overview",
    dashboardSubtitle: "Complete view of your real estate portfolio",
    importantInfo: "Important Info",
    importantInformation: "Important Information",
    kpiTitle: "Key Performance Metrics",
    kpiSubtitle: "Your portfolio at a glance",
    liveData: "Live Data",
    totalBuildings: "Total Buildings",
    totalUnits: "total units",
    occupancyRate: "Occupancy Rate",
    occupiedOf: "occupied of",
    monthlyRevenue: "Monthly Revenue",
    combinedTotal: "Combined total",
    pendingRequests: "Pending Requests",
    totalRequests: "total requests",
    actionNeeded: "Action Needed",
    buildingsPortfolio: "Buildings Portfolio",
    buildingsPortfolioSub: "Manage and monitor your property assets",
    recentRequests: "Recent Requests",
    recentRequestsSub: "Latest maintenance and service requests",
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    submittedBy: "Submitted by",
    noRequestsYet: "No requests yet",
    allRequestsHere: "All maintenance requests will appear here",
    quickStats: "Quick Statistics",
    quickStatsSub: "Performance indicators at a glance",
    totalProperties: "Total Properties",
    allOperational: "All properties operational",
    occupancy: "Occupancy",
    unitsOccupied: "units currently occupied",
    activeTenants: "Active Tenants",
    acrossProperties: "Across all properties",

    hello: "Hello",
    welcomeTenant: "Welcome to your tenant space",
    myBuilding: "My Building",
    monthlyRent: "Monthly Rent",
    currentAmount: "Current amount",
    waiting: "Pending",
    requests: "Requests",
    ongoing: "In Progress",
    leaseInfo: "Lease Information",
    leaseInfoSub: "Your rental details",
    unit: "Unit",
    address: "Address",
    leaseStart: "Lease Start",
    leaseEnd: "Lease End",
    quickActions: "Quick Actions",
    technicalRequest: "Technical Request",
    technicalRequestDesc: "Report a problem or breakdown",
    adminRequest: "Administrative Request",
    adminRequestDesc: "Certificate, termination, etc.",
    additionalRental: "Additional Rental",
    additionalRentalDesc: "Garage, parking, storage...",
    myInfo: "My Information",
    contactManagement: "Contact Management",
    myAbsences: "My Absences",
    reportAbsence: "Report",
    noAbsences: "No absences reported",
    startDate: "Start date",
    endDate: "End date",
    commentOptional: "Comment (optional)",

    buildingsTitle: "Buildings",
    buildingsSub: "Manage your real estate portfolio",
    addBuilding: "Add Building",
    editBuilding: "Edit Building",
    newBuilding: "New Building",
    buildingName: "Building Name",
    buildingAddress: "Address",
    numberOfUnits: "Number of Units",
    occupiedUnits: "Occupied Units",
    monthlyRevenueLabel: "Monthly Revenue",
    noBuildings: "No buildings",
    startAddBuilding: "Start by adding your first building",
    occupation: "Occupancy",
    units: "Units",
    revenue: "Revenue",
    buildingImage: "Building Image",
    deleteBuilding: "Delete",
    confirmDeleteBuilding: "Are you sure you want to delete this building?",
    addABuilding: "Add a building",
    unitsOccupiedOf: "Units occupied",

    tenantsTitle: "Tenants",
    tenantsSub: "Manage your tenants",
    addTenant: "Add Tenant",
    editTenant: "Edit Tenant",
    newTenant: "New Tenant",
    fullName: "Full Name",
    phone: "Phone",
    building: "Building",
    gender: "Gender",
    male: "Male",
    female: "Female",
    unspecified: "Unspecified",
    netRent: "Monthly Net Rent (CHF)",
    monthlyCharges: "Monthly Charges (CHF)",
    leaseStartLabel: "Lease Start",
    leaseEndOptional: "Lease End (optional)",
    status: "Status",
    active: "Active",
    ended: "Ended",
    noTenants: "No tenants",
    startAddTenant: "Start by adding your first tenant",
    allBuildings: "All buildings",
    tenantFile: "Tenant File",
    tenantNotes: "Notes",
    addDateNote: "Add a dated note to track history.",
    noteDate: "Date",
    notePlaceholder: "E.g.: Call with tenant, documents received, incident, etc.",
    noNotes: "No notes yet.",
    documents: "Documents",
    category: "Category",
    file: "File",
    noDocuments: "No documents added.",
    addedOn: "Added on",
    netRentLabel: "Net Rent",
    chargesLabel: "Charges",
    monthlyTotal: "Monthly Total",
    sendEmail: "Send email",
    confirmDeleteTenant: "Are you sure you want to delete this tenant?",
    selectBuilding: "Select a building",

    docHouseholdInsurance: "Household Insurance",
    docLeaseContract: "Lease Contract",
    docIdCard: "ID Card",
    docDebtRecord: "Debt Record",
    docPayslips: "Payslips",
    docCommunication: "Communication",
    docOther: "Other",

    maintenanceRequests: "Maintenance Requests",
    myRequestsTitle: "My Requests",
    requestsSub: "Manage your tenants' requests",
    requestsSubTenant: "Submit and track your repair requests",
    newRequest: "New Request",
    requestTitle: "Title",
    requestDescription: "Description",
    priority: "Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    noRequests: "No requests",
    noRequestsAdmin: "No maintenance requests at the moment",
    noRequestsTenant: "You haven't submitted any requests",
    noRequestsFilter: "No requests",
    filterAll: "All",
    filterPending: "Pending",
    filterInProgress: "In Progress",
    filterCompleted: "Completed",
    createdOn: "Created on",
    confirmDeleteRequest: "Are you sure you want to delete this request?",

    manageAllRequests: "Manage all your requests in one place",
    allMyRequests: "All my requests",
    pendingRequestsLabel: "Pending requests",
    inProgressRequests: "In-progress requests",
    completedRequests: "Completed requests",
    newRequestBtn: "New Request",
    requestType: "Request Type",
    technical: "Technical",
    administrative: "Administrative",
    rental: "Rental",
    technicalLabel: "Technical",
    administrativeLabel: "Administrative",
    rentalLabel: "Rental",
    technicalDesc: "Breakdown, repair",
    administrativeDesc: "Documents, procedures",
    rentalDesc: "Garage, parking, storage",
    categoryLabel: "Category",
    selectCategory: "Select a category",
    titleLabel: "Title",
    titlePlaceholder: "E.g.: Kitchen faucet leaking",
    detailedDescription: "Detailed Description",
    descriptionPlaceholder: "Describe the problem in detail...",
    urgencyLevel: "Urgency Level",
    dateObserved: "Date Observed",
    photosOptional: "Photos (optional)",
    clickToAddPhotos: "Click to add photos",
    photoFormats: "JPG, PNG up to 10MB",
    sendRequest: "Send Request",
    fillAllFields: "Please fill in all required fields",
    noRequestsCreate: "Create your first request",

    interventionsTitle: "Planned Interventions",
    interventionsSub: "Manage interventions in buildings",
    newIntervention: "New Intervention",
    planIntervention: "Plan an Intervention",
    noInterventions: "No planned interventions.",
    selectABuilding: "Select a building",
    concernedTenants: "Concerned Tenants",
    date: "Date",
    time: "Time",
    description: "Description",
    presenceRequired: "Presence Required",
    infoOnly: "Information only",
    tenantPresenceRequired: "Tenant presence required",
    tenantResponses: "Tenant Responses",
    present: "Present",
    absent: "Absent",

    servicesTitle: "Partner Services",
    servicesSub: "Directory of verified providers for all your needs",
    premiumPartners: "Premium Partners",
    searchServicePlaceholder: "Search for a service, company...",
    categories: "Categories",
    allServices: "All services",
    plumbing: "Plumbing",
    electrical: "Electrical",
    heating: "Heating",
    painting: "Painting",
    generalMaintenance: "General Maintenance",
    hvac: "HVAC",
    locksmith: "Locksmith",
    cleaning: "Cleaning",
    security: "Security",
    verified: "Verified",
    available: "Available",
    responds: "Responds",
    reviews: "reviews",
    result: "result",
    results: "results",
    noProviders: "No providers found",
    tryOtherCriteria: "Try with different criteria",
    offeredServices: "Offered Services",
    contactInfo: "Contact Information",
    certifications: "Certifications",
    call: "Call",
    requestQuote: "Request a Quote",

    notificationsTitle: "Notifications",
    notificationsSub: "Send notifications to your tenants",
    notificationsSubTenant: "Your notifications",
    newNotification: "New Notification",
    notifTitle: "Title",
    notifMessage: "Message",
    notifBuilding: "Building (optional)",
    notifRecipient: "Recipient (optional)",
    allBuildingsOption: "All buildings",
    allTenantsOption: "All tenants",
    newLabel: "New",
    markAsRead: "Mark as read",
    confirmDeleteNotif: "Are you sure you want to delete this notification?",
    noNotifications: "No notifications",
    noNotifAdmin: "Start by sending a notification to your tenants",
    noNotifTenant: "You have no notifications at the moment",
    alertTenants: "Alert Tenants",
    broadcastTitle: "Alert Tenants",
    broadcastSubject: "Subject",
    broadcastMessage: "Message",
    recipients: "Recipients",
    sendToAll: "Send to all",
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: "{n} days ago",

    informationsTitle: "Information",
    informationsSub: "Important information for property management",
    infoTenantTitle: "Building Information",
    infoTenantSub: "Useful documents and information for your residence",
    referenceRate: "Reference Mortgage Rate",
    referenceRateText: "The reference mortgage rate has dropped from 1.50% to 1.25%. Tenants may request a rent reduction based on their last applicable reference rate.",
    cpiIndexation: "CPI Indexation",
    cpiIndexationText: "Rents may be adjusted according to the Swiss consumer price index (CPI) if contractually provided. In practice, CPI variation may be passed on to rent at approximately 40% of the tenant's share.",
    maintenanceReserves: "Recommended Maintenance Reserves",
    maintenanceReservesText: "Plan between 0.8% and 1.2% of the property value per year.",
    regulations: "Regulations",
    buildingRules: "Building Rules (PDF)",
    laundryRules: "Laundry Room Rules (PDF)",
    wasteRules: "Waste Sorting Guidelines (PDF)",
    usefulContacts: "Useful Contacts",
    managementEmergency: "Management (Emergency)",
    concierge: "Concierge",
    medicalEmergency: "Medical Emergency",
    police: "Police",

    myProfile: "My Profile",
    name: "Name",
    role: "Role",

    infoReferenceRate: "Reference Mortgage Rate",
    infoReferenceRateDesc: "The reference mortgage rate has dropped from 1.50% to 1.25%. Tenants may request a rent reduction based on their last applicable base and current regulations.",
    infoCpiIndex: "CPI Indexation",
    infoCpiIndexDesc: "Keep track of the CPI base used in the last adjustment. Any increase/decrease request is calculated against the same economic base.",
    infoRenewal: "Renewals and Terminations",
    infoRenewalDesc: "Centralize lease deadlines (termination periods, renewal options, move-in/out dates). Schedule reminders 60/30/15 days before key dates.",
    infoMaintenance: "Proactive Maintenance",
    infoMaintenanceDesc: "Schedule periodic inspections: boilers, ventilation, detectors, common areas. Prevention often costs less than emergency repairs.",
    infoInsurance: "Insurance and Claims",
    infoInsuranceDesc: "Check building coverage, owner liability, water damage, glass breakage. Document claims (photos, dates, quotes) to speed up processing.",
    infoCharges: "Charges and Statements",
    infoChargesDesc: "Keep invoices, statements, and allocation keys. To limit disputes: transparency on items, consistent periodicity, and accessible supporting documents.",
    infoVacancy: "Vacancy and Marketing",
    infoVacancyDesc: "Prepare a vacancy plan: photos, standard listing, inspection checklist, viewings. Shorter relocation time reduces cash-flow impact.",
    infoDocumentation: "Tenant Documentation",
    infoDocumentationDesc: "Standardize: inspection reports, inventory, important communications, proof of delivery. Good traceability reduces disputes.",
    infoDisclaimer: "This information is indicative and does not replace professional legal advice.",

    tagSwitzerland: "Switzerland",
    tagManagement: "Management",
    tagProcess: "Process",
    tagExploitation: "Operations",
    tagRisk: "Risk",
    tagFinance: "Finance",
    tagRental: "Rental",
    tagCompliance: "Compliance",

    tenantsOverview: "Overview of your tenants by building",
    searchTenants: "Search tenants...",
    tenantCount: "tenants",
    occupancyLabel: "Occupancy",
    viewProfile: "View profile",
    contactTenant: "Contact",
    addNote: "Add note",
    viewRequests: "View requests",
    viewDocuments: "Documents",
    leaseDetails: "Lease details",
    financials: "Financials",
    tenantSince: "Tenant since",
    leaseEnds: "Lease ends",
    totalMonthly: "Monthly total",
    internalNotes: "Internal notes",
    managementNotes: "Management notes and follow-up",
    writeNote: "Write a note...",
    noNotesYet: "No notes yet",
    recentActivity: "Recent activity",
    noActivity: "No recent activity",
    openRequests: "Open requests",
    closedRequests: "Closed requests",
    leaving: "Leaving",

    requestsHub: "Requests",
    requestsHubSub: "Manage maintenance requests and rental applications",
    maintenanceTab: "Maintenance",
    rentalApplicationsTab: "Applications",
    rentalApplications: "Rental Applications",
    rentalApplicationsSub: "Manage prospective tenant applications",
    newRentalApplication: "New application",
    applicantName: "Applicant name",
    applicantEmail: "Email",
    applicantPhone: "Phone",
    desiredUnit: "Desired unit",
    desiredMoveIn: "Desired move-in date",
    monthlyIncome: "Monthly income",
    currentAddress: "Current address",
    applicationMessage: "Application message",
    applicationStatus: "Application status",
    received: "Received",
    underReview: "Under review",
    accepted: "Accepted",
    rejected: "Rejected",
    noApplications: "No applications",
    noApplicationsSub: "New rental applications will appear here",
    reviewApplication: "Review application",
    applicantInfo: "Applicant information",
    applicationDetails: "Application details",
    householdSize: "Household size",
    applicantOccupation: "Occupation",
    employer: "Employer",
    applicationDate: "Application date",
    approve: "Approve",
    reject: "Reject",
    markUnderReview: "Mark under review",
    numberOfPersons: "persons",

    sendDocument: "Send document",
    sendDocumentTitle: "Send document",
    sendDocumentSub: "Send a document directly to",
    docType: "Document type",
    selectFile: "File",
    clickToSelectFile: "Click to select a file",
    optionalMessage: "Message (optional)",
    sendDocMessagePlaceholder: "E.g.: Please find attached the move-in/move-out inspection checklist...",
    sendToTenant: "Send to tenant",
    docSentNotifTitle: "Document received",
    docSentNotifMessage: "A document has been sent to you:",

    lightMode: "Day",
    darkMode: "Night",
    theme: "Theme",
  },

  de: {
    appName: "Immostore",
    admin: "Administrator",
    tenant: "Mieter",
    save: "Speichern",
    cancel: "Abbrechen",
    create: "Erstellen",
    update: "Aktualisieren",
    delete: "Löschen",
    add: "Hinzufügen",
    edit: "Bearbeiten",
    search: "Suchen",
    all: "Alle",
    close: "Schliessen",
    send: "Senden",
    submit: "Absenden",
    loading: "Laden...",
    noData: "Keine Daten",
    confirm: "Bestätigen",
    yes: "Ja",
    no: "Nein",
    back: "Zurück",
    open: "Öffnen",
    details: "Details",

    login: "Anmelden",
    logout: "Abmelden",
    email: "E-Mail",
    password: "Passwort",
    loginTitle: "Anmelden",
    loginSubtitle: "Intelligente Immobilienverwaltung",
    loginButton: "Anmelden",
    loginError: "E-Mail oder Passwort ungültig",
    loginFieldsRequired: "Bitte alle Felder ausfüllen",
    demoAccounts: "Demo-Konten:",
    allRightsReserved: "© 2026 Immostore. Alle Rechte vorbehalten.",
    loggedInAs: "Angemeldet als",

    navDashboard: "Dashboard",
    navBuildings: "Gebäude",
    navTenants: "Mieter",
    navRequests: "Anfragen",
    navInterventions: "Interventionen",
    navServices: "Dienstleistungen",
    navNotifications: "Benachrichtigungen",
    navInformations: "Informationen",
    navSettings: "Einstellungen",
    navSupport: "Support",
    navHome: "Startseite",
    navMyRequests: "Meine Anfragen",

    searchPlaceholder: "Immobilien, Mieter oder Anfragen suchen...",

    dashboardTitle: "Übersicht",
    dashboardSubtitle: "Gesamtübersicht Ihres Immobilienportfolios",
    importantInfo: "Wichtige Infos",
    importantInformation: "Wichtige Informationen",
    kpiTitle: "Leistungskennzahlen",
    kpiSubtitle: "Ihr Portfolio auf einen Blick",
    liveData: "Echtzeit-Daten",
    totalBuildings: "Gebäude gesamt",
    totalUnits: "Einheiten gesamt",
    occupancyRate: "Belegungsrate",
    occupiedOf: "belegt von",
    monthlyRevenue: "Monatliche Einnahmen",
    combinedTotal: "Gesamtsumme",
    pendingRequests: "Offene Anfragen",
    totalRequests: "Anfragen gesamt",
    actionNeeded: "Handlung nötig",
    buildingsPortfolio: "Immobilienportfolio",
    buildingsPortfolioSub: "Verwalten und überwachen Sie Ihre Immobilien",
    recentRequests: "Aktuelle Anfragen",
    recentRequestsSub: "Neueste Wartungs- und Serviceanfragen",
    pending: "Ausstehend",
    inProgress: "In Bearbeitung",
    completed: "Abgeschlossen",
    submittedBy: "Eingereicht von",
    noRequestsYet: "Keine Anfragen",
    allRequestsHere: "Alle Wartungsanfragen erscheinen hier",
    quickStats: "Schnellstatistiken",
    quickStatsSub: "Leistungsindikatoren im Überblick",
    totalProperties: "Gesamtimmobilien",
    allOperational: "Alle Immobilien betriebsbereit",
    occupancy: "Belegung",
    unitsOccupied: "Einheiten aktuell belegt",
    activeTenants: "Aktive Mieter",
    acrossProperties: "Über alle Immobilien",

    hello: "Hallo",
    welcomeTenant: "Willkommen in Ihrem Mieterbereich",
    myBuilding: "Mein Gebäude",
    monthlyRent: "Monatsmiete",
    currentAmount: "Aktueller Betrag",
    waiting: "Ausstehend",
    requests: "Anfragen",
    ongoing: "In Bearbeitung",
    leaseInfo: "Mietvertragsinformationen",
    leaseInfoSub: "Ihre Mietdaten",
    unit: "Einheit",
    address: "Adresse",
    leaseStart: "Mietbeginn",
    leaseEnd: "Mietende",
    quickActions: "Schnellaktionen",
    technicalRequest: "Technische Anfrage",
    technicalRequestDesc: "Problem oder Störung melden",
    adminRequest: "Administrative Anfrage",
    adminRequestDesc: "Bescheinigung, Kündigung, etc.",
    additionalRental: "Zusatzmiete",
    additionalRentalDesc: "Garage, Parkplatz, Keller...",
    myInfo: "Meine Informationen",
    contactManagement: "Verwaltung kontaktieren",
    myAbsences: "Meine Abwesenheiten",
    reportAbsence: "Melden",
    noAbsences: "Keine Abwesenheiten gemeldet",
    startDate: "Startdatum",
    endDate: "Enddatum",
    commentOptional: "Kommentar (optional)",

    buildingsTitle: "Gebäude",
    buildingsSub: "Verwalten Sie Ihr Immobilienportfolio",
    addBuilding: "Gebäude hinzufügen",
    editBuilding: "Gebäude bearbeiten",
    newBuilding: "Neues Gebäude",
    buildingName: "Gebäudename",
    buildingAddress: "Adresse",
    numberOfUnits: "Anzahl Einheiten",
    occupiedUnits: "Belegte Einheiten",
    monthlyRevenueLabel: "Monatliche Einnahmen",
    noBuildings: "Keine Gebäude",
    startAddBuilding: "Fügen Sie Ihr erstes Gebäude hinzu",
    occupation: "Belegung",
    units: "Einheiten",
    revenue: "Einnahmen",
    buildingImage: "Gebäudebild",
    deleteBuilding: "Löschen",
    confirmDeleteBuilding: "Sind Sie sicher, dass Sie dieses Gebäude löschen möchten?",
    addABuilding: "Gebäude hinzufügen",
    unitsOccupiedOf: "Belegte Einheiten",

    tenantsTitle: "Mieter",
    tenantsSub: "Verwalten Sie Ihre Mieter",
    addTenant: "Mieter hinzufügen",
    editTenant: "Mieter bearbeiten",
    newTenant: "Neuer Mieter",
    fullName: "Vollständiger Name",
    phone: "Telefon",
    building: "Gebäude",
    gender: "Geschlecht",
    male: "Männlich",
    female: "Weiblich",
    unspecified: "Nicht angegeben",
    netRent: "Monatliche Nettomiete (CHF)",
    monthlyCharges: "Monatliche Nebenkosten (CHF)",
    leaseStartLabel: "Mietbeginn",
    leaseEndOptional: "Mietende (optional)",
    status: "Status",
    active: "Aktiv",
    ended: "Beendet",
    noTenants: "Keine Mieter",
    startAddTenant: "Fügen Sie Ihren ersten Mieter hinzu",
    allBuildings: "Alle Gebäude",
    tenantFile: "Mieterdossier",
    tenantNotes: "Notizen",
    addDateNote: "Fügen Sie eine datierte Notiz hinzu.",
    noteDate: "Datum",
    notePlaceholder: "Z.B.: Anruf mit Mieter, Dokumente erhalten, Vorfall, etc.",
    noNotes: "Noch keine Notizen.",
    documents: "Dokumente",
    category: "Kategorie",
    file: "Datei",
    noDocuments: "Keine Dokumente hinzugefügt.",
    addedOn: "Hinzugefügt am",
    netRentLabel: "Nettomiete",
    chargesLabel: "Nebenkosten",
    monthlyTotal: "Monatlich gesamt",
    sendEmail: "E-Mail senden",
    confirmDeleteTenant: "Sind Sie sicher, dass Sie diesen Mieter löschen möchten?",
    selectBuilding: "Gebäude auswählen",

    docHouseholdInsurance: "Hausratversicherung",
    docLeaseContract: "Mietvertrag",
    docIdCard: "Ausweis",
    docDebtRecord: "Betreibungsregister",
    docPayslips: "Lohnabrechnungen",
    docCommunication: "Kommunikation",
    docOther: "Andere",

    maintenanceRequests: "Wartungsanfragen",
    myRequestsTitle: "Meine Anfragen",
    requestsSub: "Verwalten Sie die Anfragen Ihrer Mieter",
    requestsSubTenant: "Reichen Sie Ihre Reparaturanfragen ein",
    newRequest: "Neue Anfrage",
    requestTitle: "Titel",
    requestDescription: "Beschreibung",
    priority: "Priorität",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    urgent: "Dringend",
    noRequests: "Keine Anfragen",
    noRequestsAdmin: "Derzeit keine Wartungsanfragen",
    noRequestsTenant: "Sie haben keine Anfragen eingereicht",
    noRequestsFilter: "Keine Anfragen",
    filterAll: "Alle",
    filterPending: "Ausstehend",
    filterInProgress: "In Bearbeitung",
    filterCompleted: "Abgeschlossen",
    createdOn: "Erstellt am",
    confirmDeleteRequest: "Sind Sie sicher, dass Sie diese Anfrage löschen möchten?",

    manageAllRequests: "Verwalten Sie alle Ihre Anfragen an einem Ort",
    allMyRequests: "Alle meine Anfragen",
    pendingRequestsLabel: "Ausstehende Anfragen",
    inProgressRequests: "Anfragen in Bearbeitung",
    completedRequests: "Abgeschlossene Anfragen",
    newRequestBtn: "Neue Anfrage",
    requestType: "Anfragetyp",
    technical: "Technisch",
    administrative: "Administrativ",
    rental: "Miete",
    technicalLabel: "Technisch",
    administrativeLabel: "Administrativ",
    rentalLabel: "Miete",
    technicalDesc: "Störung, Reparatur",
    administrativeDesc: "Dokumente, Verfahren",
    rentalDesc: "Garage, Parkplatz, Keller",
    categoryLabel: "Kategorie",
    selectCategory: "Kategorie auswählen",
    titleLabel: "Titel",
    titlePlaceholder: "Z.B.: Küchenhahn tropft",
    detailedDescription: "Detaillierte Beschreibung",
    descriptionPlaceholder: "Beschreiben Sie das Problem im Detail...",
    urgencyLevel: "Dringlichkeitsstufe",
    dateObserved: "Feststellungsdatum",
    photosOptional: "Fotos (optional)",
    clickToAddPhotos: "Klicken Sie, um Fotos hinzuzufügen",
    photoFormats: "JPG, PNG bis 10MB",
    sendRequest: "Anfrage senden",
    fillAllFields: "Bitte alle Pflichtfelder ausfüllen",
    noRequestsCreate: "Erstellen Sie Ihre erste Anfrage",

    interventionsTitle: "Geplante Interventionen",
    interventionsSub: "Verwalten Sie Interventionen in Gebäuden",
    newIntervention: "Neue Intervention",
    planIntervention: "Intervention planen",
    noInterventions: "Keine geplanten Interventionen.",
    selectABuilding: "Gebäude auswählen",
    concernedTenants: "Betroffene Mieter",
    date: "Datum",
    time: "Uhrzeit",
    description: "Beschreibung",
    presenceRequired: "Anwesenheit erforderlich",
    infoOnly: "Nur zur Information",
    tenantPresenceRequired: "Anwesenheit des Mieters erforderlich",
    tenantResponses: "Mieterrückmeldungen",
    present: "Anwesend",
    absent: "Abwesend",

    servicesTitle: "Partnerdienstleistungen",
    servicesSub: "Verzeichnis geprüfter Anbieter für alle Ihre Bedürfnisse",
    premiumPartners: "Premium-Partner",
    searchServicePlaceholder: "Service oder Unternehmen suchen...",
    categories: "Kategorien",
    allServices: "Alle Dienstleistungen",
    plumbing: "Sanitär",
    electrical: "Elektrik",
    heating: "Heizung",
    painting: "Malerei",
    generalMaintenance: "Allgemeine Wartung",
    hvac: "Klimatisierung",
    locksmith: "Schlüsseldienst",
    cleaning: "Reinigung",
    security: "Sicherheit",
    verified: "Verifiziert",
    available: "Verfügbar",
    responds: "Antwortet",
    reviews: "Bewertungen",
    result: "Ergebnis",
    results: "Ergebnisse",
    noProviders: "Keine Anbieter gefunden",
    tryOtherCriteria: "Versuchen Sie es mit anderen Kriterien",
    offeredServices: "Angebotene Dienstleistungen",
    contactInfo: "Kontaktinformationen",
    certifications: "Zertifizierungen",
    call: "Anrufen",
    requestQuote: "Angebot anfordern",

    notificationsTitle: "Benachrichtigungen",
    notificationsSub: "Senden Sie Benachrichtigungen an Ihre Mieter",
    notificationsSubTenant: "Ihre Benachrichtigungen",
    newNotification: "Neue Benachrichtigung",
    notifTitle: "Titel",
    notifMessage: "Nachricht",
    notifBuilding: "Gebäude (optional)",
    notifRecipient: "Empfänger (optional)",
    allBuildingsOption: "Alle Gebäude",
    allTenantsOption: "Alle Mieter",
    newLabel: "Neu",
    markAsRead: "Als gelesen markieren",
    confirmDeleteNotif: "Sind Sie sicher, dass Sie diese Benachrichtigung löschen möchten?",
    noNotifications: "Keine Benachrichtigungen",
    noNotifAdmin: "Senden Sie eine Benachrichtigung an Ihre Mieter",
    noNotifTenant: "Sie haben derzeit keine Benachrichtigungen",
    alertTenants: "Mieter benachrichtigen",
    broadcastTitle: "Mieter benachrichtigen",
    broadcastSubject: "Betreff",
    broadcastMessage: "Nachricht",
    recipients: "Empfänger",
    sendToAll: "An alle senden",
    today: "Heute",
    yesterday: "Gestern",
    daysAgo: "Vor {n} Tagen",

    informationsTitle: "Informationen",
    informationsSub: "Wichtige Informationen für die Immobilienverwaltung",
    infoTenantTitle: "Gebäudeinformationen",
    infoTenantSub: "Nützliche Dokumente und Informationen für Ihre Residenz",
    referenceRate: "Referenzhypothekarzins",
    referenceRateText: "Der Referenzhypothekarzins ist von 1.50% auf 1.25% gesunken. Mieter können eine Mietreduktion basierend auf ihrem letzten anwendbaren Referenzzins beantragen.",
    cpiIndexation: "LIK-Indexierung",
    cpiIndexationText: "Mieten können gemäss der Entwicklung des Schweizer Landesindex der Konsumentenpreise (LIK) angepasst werden, sofern vertraglich vereinbart.",
    maintenanceReserves: "Empfohlene Unterhaltsrückstellungen",
    maintenanceReservesText: "Planen Sie zwischen 0.8% und 1.2% des Immobilienwerts pro Jahr ein.",
    regulations: "Reglement",
    buildingRules: "Hausordnung (PDF)",
    laundryRules: "Waschküchenregeln (PDF)",
    wasteRules: "Abfalltrennung (PDF)",
    usefulContacts: "Nützliche Kontakte",
    managementEmergency: "Verwaltung (Notfall)",
    concierge: "Hauswart",
    medicalEmergency: "Medizinischer Notfall",
    police: "Polizei",

    myProfile: "Mein Profil",
    name: "Name",
    role: "Rolle",

    infoReferenceRate: "Referenzhypothekarzins",
    infoReferenceRateDesc: "Der Referenzhypothekarzins ist von 1.50% auf 1.25% gesunken. Mieter können eine Mietsenkung beantragen.",
    infoCpiIndex: "LIK-Indexierung",
    infoCpiIndexDesc: "Behalten Sie die beim letzten Anpassung verwendete LIK-Basis im Blick.",
    infoRenewal: "Erneuerungen und Kündigungen",
    infoRenewalDesc: "Zentralisieren Sie Mietfristen. Planen Sie Erinnerungen 60/30/15 Tage vor Schlüsseldaten.",
    infoMaintenance: "Proaktive Wartung",
    infoMaintenanceDesc: "Planen Sie periodische Inspektionen: Heizkessel, Lüftung, Detektoren, Gemeinschaftsbereiche.",
    infoInsurance: "Versicherungen und Schadensfälle",
    infoInsuranceDesc: "Prüfen Sie Gebäudeversicherung, Haftpflicht, Wasserschäden, Glasbruch.",
    infoCharges: "Nebenkosten und Abrechnungen",
    infoChargesDesc: "Bewahren Sie Rechnungen und Verteilungsschlüssel auf. Transparenz reduziert Streitigkeiten.",
    infoVacancy: "Leerstand und Vermarktung",
    infoVacancyDesc: "Bereiten Sie einen Leerstandsplan vor: Fotos, Standard-Inserat, Besichtigungen.",
    infoDocumentation: "Mieterdokumentation",
    infoDocumentationDesc: "Standardisieren Sie: Abnahmeprotokolle, Inventar, wichtige Mitteilungen.",
    infoDisclaimer: "Diese Informationen sind indikativ und ersetzen keine professionelle Rechtsberatung.",

    tagSwitzerland: "Schweiz",
    tagManagement: "Verwaltung",
    tagProcess: "Prozess",
    tagExploitation: "Betrieb",
    tagRisk: "Risiko",
    tagFinance: "Finanzen",
    tagRental: "Vermietung",
    tagCompliance: "Compliance",

    tenantsOverview: "Übersicht Ihrer Mieter nach Gebäude",
    searchTenants: "Mieter suchen...",
    tenantCount: "Mieter",
    occupancyLabel: "Belegung",
    viewProfile: "Profil anzeigen",
    contactTenant: "Kontaktieren",
    addNote: "Notiz hinzufügen",
    viewRequests: "Anfragen anzeigen",
    viewDocuments: "Dokumente",
    leaseDetails: "Mietvertrag",
    financials: "Finanzen",
    tenantSince: "Mieter seit",
    leaseEnds: "Mietende",
    totalMonthly: "Monatlich gesamt",
    internalNotes: "Interne Notizen",
    managementNotes: "Verwaltungsnotizen und Nachverfolgung",
    writeNote: "Notiz schreiben...",
    noNotesYet: "Noch keine Notizen",
    recentActivity: "Letzte Aktivität",
    noActivity: "Keine aktuelle Aktivität",
    openRequests: "Offene Anfragen",
    closedRequests: "Abgeschlossene Anfragen",
    leaving: "Auszug",

    requestsHub: "Anfragen",
    requestsHubSub: "Wartungsanfragen und Mietbewerbungen verwalten",
    maintenanceTab: "Wartung",
    rentalApplicationsTab: "Bewerbungen",
    rentalApplications: "Mietbewerbungen",
    rentalApplicationsSub: "Bewerbungen von Mietinteressenten verwalten",
    newRentalApplication: "Neue Bewerbung",
    applicantName: "Name des Bewerbers",
    applicantEmail: "E-Mail",
    applicantPhone: "Telefon",
    desiredUnit: "Gewünschte Einheit",
    desiredMoveIn: "Gewünschtes Einzugsdatum",
    monthlyIncome: "Monatliches Einkommen",
    currentAddress: "Aktuelle Adresse",
    applicationMessage: "Bewerbungsnachricht",
    applicationStatus: "Bewerbungsstatus",
    received: "Eingegangen",
    underReview: "In Prüfung",
    accepted: "Angenommen",
    rejected: "Abgelehnt",
    noApplications: "Keine Bewerbungen",
    noApplicationsSub: "Neue Mietbewerbungen erscheinen hier",
    reviewApplication: "Bewerbung prüfen",
    applicantInfo: "Bewerberinformationen",
    applicationDetails: "Bewerbungsdetails",
    householdSize: "Haushaltsgröße",
    applicantOccupation: "Beruf",
    employer: "Arbeitgeber",
    applicationDate: "Bewerbungsdatum",
    approve: "Genehmigen",
    reject: "Ablehnen",
    markUnderReview: "In Prüfung setzen",
    numberOfPersons: "Personen",

    sendDocument: "Dokument senden",
    sendDocumentTitle: "Dokument senden",
    sendDocumentSub: "Ein Dokument direkt senden an",
    docType: "Dokumenttyp",
    selectFile: "Datei",
    clickToSelectFile: "Klicken Sie, um eine Datei auszuwählen",
    optionalMessage: "Nachricht (optional)",
    sendDocMessagePlaceholder: "Z.B.: Bitte finden Sie anbei die Ein-/Auszugscheckliste...",
    sendToTenant: "An Mieter senden",
    docSentNotifTitle: "Dokument erhalten",
    docSentNotifMessage: "Ein Dokument wurde Ihnen zugesandt:",

    lightMode: "Tag",
    darkMode: "Nacht",
    theme: "Thema",
  },

  it: {
    appName: "Immostore",
    admin: "Amministratore",
    tenant: "Inquilino",
    save: "Salvare",
    cancel: "Annullare",
    create: "Creare",
    update: "Aggiornare",
    delete: "Eliminare",
    add: "Aggiungere",
    edit: "Modificare",
    search: "Cercare",
    all: "Tutti",
    close: "Chiudere",
    send: "Inviare",
    submit: "Inviare",
    loading: "Caricamento...",
    noData: "Nessun dato",
    confirm: "Confermare",
    yes: "Sì",
    no: "No",
    back: "Indietro",
    open: "Aprire",
    details: "Dettagli",

    login: "Accesso",
    logout: "Disconnettersi",
    email: "Email",
    password: "Password",
    loginTitle: "Accesso",
    loginSubtitle: "Gestione immobiliare intelligente",
    loginButton: "Accedi",
    loginError: "Email o password non corretti",
    loginFieldsRequired: "Compilare tutti i campi",
    demoAccounts: "Account demo:",
    allRightsReserved: "© 2026 Immostore. Tutti i diritti riservati.",
    loggedInAs: "Connesso come",

    navDashboard: "Dashboard",
    navBuildings: "Edifici",
    navTenants: "Inquilini",
    navRequests: "Richieste",
    navInterventions: "Interventi",
    navServices: "Servizi",
    navNotifications: "Notifiche",
    navInformations: "Informazioni",
    navSettings: "Impostazioni",
    navSupport: "Supporto",
    navHome: "Home",
    navMyRequests: "Le mie richieste",

    searchPlaceholder: "Cerca proprietà, inquilini o richieste...",

    dashboardTitle: "Panoramica",
    dashboardSubtitle: "Vista completa del vostro portafoglio immobiliare",
    importantInfo: "Info importanti",
    importantInformation: "Informazioni importanti",
    kpiTitle: "Indicatori chiave",
    kpiSubtitle: "Il vostro portafoglio in sintesi",
    liveData: "Dati in tempo reale",
    totalBuildings: "Edifici totali",
    totalUnits: "unità totali",
    occupancyRate: "Tasso di occupazione",
    occupiedOf: "occupate su",
    monthlyRevenue: "Entrate mensili",
    combinedTotal: "Totale combinato",
    pendingRequests: "Richieste in sospeso",
    totalRequests: "richieste totali",
    actionNeeded: "Azione necessaria",
    buildingsPortfolio: "Portafoglio immobiliare",
    buildingsPortfolioSub: "Gestisci e monitora i tuoi immobili",
    recentRequests: "Richieste recenti",
    recentRequestsSub: "Ultime richieste di manutenzione",
    pending: "In sospeso",
    inProgress: "In corso",
    completed: "Completato",
    submittedBy: "Inviato da",
    noRequestsYet: "Nessuna richiesta",
    allRequestsHere: "Tutte le richieste appariranno qui",
    quickStats: "Statistiche rapide",
    quickStatsSub: "Indicatori di performance",
    totalProperties: "Proprietà totali",
    allOperational: "Tutte le proprietà operative",
    occupancy: "Occupazione",
    unitsOccupied: "unità attualmente occupate",
    activeTenants: "Inquilini attivi",
    acrossProperties: "In tutte le proprietà",

    hello: "Buongiorno",
    welcomeTenant: "Benvenuto nel vostro spazio inquilino",
    myBuilding: "Il mio edificio",
    monthlyRent: "Affitto mensile",
    currentAmount: "Importo attuale",
    waiting: "In sospeso",
    requests: "Richieste",
    ongoing: "In corso",
    leaseInfo: "Informazioni sul contratto",
    leaseInfoSub: "I dati del vostro affitto",
    unit: "Unità",
    address: "Indirizzo",
    leaseStart: "Inizio contratto",
    leaseEnd: "Fine contratto",
    quickActions: "Azioni rapide",
    technicalRequest: "Richiesta tecnica",
    technicalRequestDesc: "Segnalare un problema o un guasto",
    adminRequest: "Richiesta amministrativa",
    adminRequestDesc: "Attestazione, disdetta, ecc.",
    additionalRental: "Affitto complementare",
    additionalRentalDesc: "Garage, parcheggio, cantina...",
    myInfo: "Le mie informazioni",
    contactManagement: "Contattare l'amministrazione",
    myAbsences: "Le mie assenze",
    reportAbsence: "Segnalare",
    noAbsences: "Nessuna assenza segnalata",
    startDate: "Data di inizio",
    endDate: "Data di fine",
    commentOptional: "Commento (opzionale)",

    buildingsTitle: "Edifici",
    buildingsSub: "Gestisci il tuo portafoglio immobiliare",
    addBuilding: "Aggiungi edificio",
    editBuilding: "Modifica edificio",
    newBuilding: "Nuovo edificio",
    buildingName: "Nome dell'edificio",
    buildingAddress: "Indirizzo",
    numberOfUnits: "Numero di unità",
    occupiedUnits: "Unità occupate",
    monthlyRevenueLabel: "Entrate mensili",
    noBuildings: "Nessun edificio",
    startAddBuilding: "Inizia aggiungendo il tuo primo edificio",
    occupation: "Occupazione",
    units: "Unità",
    revenue: "Entrate",
    buildingImage: "Immagine dell'edificio",
    deleteBuilding: "Eliminare",
    confirmDeleteBuilding: "Sei sicuro di voler eliminare questo edificio?",
    addABuilding: "Aggiungi un edificio",
    unitsOccupiedOf: "Unità occupate",

    tenantsTitle: "Inquilini",
    tenantsSub: "Gestisci i tuoi inquilini",
    addTenant: "Aggiungi inquilino",
    editTenant: "Modifica inquilino",
    newTenant: "Nuovo inquilino",
    fullName: "Nome completo",
    phone: "Telefono",
    building: "Edificio",
    gender: "Genere",
    male: "Uomo",
    female: "Donna",
    unspecified: "Non specificato",
    netRent: "Affitto netto mensile (CHF)",
    monthlyCharges: "Spese mensili (CHF)",
    leaseStartLabel: "Inizio contratto",
    leaseEndOptional: "Fine contratto (opzionale)",
    status: "Stato",
    active: "Attivo",
    ended: "Terminato",
    noTenants: "Nessun inquilino",
    startAddTenant: "Inizia aggiungendo il tuo primo inquilino",
    allBuildings: "Tutti gli edifici",
    tenantFile: "Scheda inquilino",
    tenantNotes: "Note",
    addDateNote: "Aggiungi una nota datata per seguire la cronologia.",
    noteDate: "Data",
    notePlaceholder: "Es.: Chiamata con inquilino, documenti ricevuti, incidente, ecc.",
    noNotes: "Nessuna nota al momento.",
    documents: "Documenti",
    category: "Categoria",
    file: "File",
    noDocuments: "Nessun documento aggiunto.",
    addedOn: "Aggiunto il",
    netRentLabel: "Affitto netto",
    chargesLabel: "Spese",
    monthlyTotal: "Totale mensile",
    sendEmail: "Inviare email",
    confirmDeleteTenant: "Sei sicuro di voler eliminare questo inquilino?",
    selectBuilding: "Seleziona un edificio",

    docHouseholdInsurance: "Assicurazione domestica",
    docLeaseContract: "Contratto di locazione",
    docIdCard: "Carta d'identità",
    docDebtRecord: "Estratto esecuzioni",
    docPayslips: "Buste paga",
    docCommunication: "Comunicazione",
    docOther: "Altro",

    maintenanceRequests: "Richieste di manutenzione",
    myRequestsTitle: "Le mie richieste",
    requestsSub: "Gestisci le richieste dei tuoi inquilini",
    requestsSubTenant: "Invia e segui le tue richieste di riparazione",
    newRequest: "Nuova richiesta",
    requestTitle: "Titolo",
    requestDescription: "Descrizione",
    priority: "Priorità",
    low: "Bassa",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
    noRequests: "Nessuna richiesta",
    noRequestsAdmin: "Nessuna richiesta di manutenzione al momento",
    noRequestsTenant: "Non hai inviato nessuna richiesta",
    noRequestsFilter: "Nessuna richiesta",
    filterAll: "Tutte",
    filterPending: "In sospeso",
    filterInProgress: "In corso",
    filterCompleted: "Completate",
    createdOn: "Creato il",
    confirmDeleteRequest: "Sei sicuro di voler eliminare questa richiesta?",

    manageAllRequests: "Gestisci tutte le tue richieste in un unico posto",
    allMyRequests: "Tutte le mie richieste",
    pendingRequestsLabel: "Richieste in sospeso",
    inProgressRequests: "Richieste in corso",
    completedRequests: "Richieste completate",
    newRequestBtn: "Nuova richiesta",
    requestType: "Tipo di richiesta",
    technical: "Tecnico",
    administrative: "Amministrativo",
    rental: "Affitto",
    technicalLabel: "Tecnico",
    administrativeLabel: "Amministrativo",
    rentalLabel: "Affitto",
    technicalDesc: "Guasto, riparazione",
    administrativeDesc: "Documenti, procedure",
    rentalDesc: "Garage, parcheggio, cantina",
    categoryLabel: "Categoria",
    selectCategory: "Seleziona una categoria",
    titleLabel: "Titolo",
    titlePlaceholder: "Es.: Rubinetto della cucina che perde",
    detailedDescription: "Descrizione dettagliata",
    descriptionPlaceholder: "Descrivi il problema in dettaglio...",
    urgencyLevel: "Livello di urgenza",
    dateObserved: "Data di osservazione",
    photosOptional: "Foto (opzionale)",
    clickToAddPhotos: "Clicca per aggiungere foto",
    photoFormats: "JPG, PNG fino a 10MB",
    sendRequest: "Invia richiesta",
    fillAllFields: "Compilare tutti i campi obbligatori",
    noRequestsCreate: "Crea la tua prima richiesta",

    interventionsTitle: "Interventi pianificati",
    interventionsSub: "Gestisci gli interventi negli edifici",
    newIntervention: "Nuovo intervento",
    planIntervention: "Pianificare un intervento",
    noInterventions: "Nessun intervento pianificato.",
    selectABuilding: "Seleziona un edificio",
    concernedTenants: "Inquilini interessati",
    date: "Data",
    time: "Ora",
    description: "Descrizione",
    presenceRequired: "Presenza richiesta",
    infoOnly: "Solo informazione",
    tenantPresenceRequired: "Presenza dell'inquilino richiesta",
    tenantResponses: "Risposte degli inquilini",
    present: "Presente",
    absent: "Assente",

    servicesTitle: "Servizi Partner",
    servicesSub: "Elenco di fornitori verificati per tutte le vostre esigenze",
    premiumPartners: "Partner Premium",
    searchServicePlaceholder: "Cerca un servizio, un'azienda...",
    categories: "Categorie",
    allServices: "Tutti i servizi",
    plumbing: "Idraulica",
    electrical: "Elettricità",
    heating: "Riscaldamento",
    painting: "Pittura",
    generalMaintenance: "Manutenzione generale",
    hvac: "Climatizzazione",
    locksmith: "Fabbro",
    cleaning: "Pulizia",
    security: "Sicurezza",
    verified: "Verificato",
    available: "Disponibile",
    responds: "Risponde",
    reviews: "recensioni",
    result: "risultato",
    results: "risultati",
    noProviders: "Nessun fornitore trovato",
    tryOtherCriteria: "Prova con altri criteri",
    offeredServices: "Servizi offerti",
    contactInfo: "Informazioni di contatto",
    certifications: "Certificazioni",
    call: "Chiamare",
    requestQuote: "Richiedere un preventivo",

    notificationsTitle: "Notifiche",
    notificationsSub: "Invia notifiche ai tuoi inquilini",
    notificationsSubTenant: "Le tue notifiche",
    newNotification: "Nuova notifica",
    notifTitle: "Titolo",
    notifMessage: "Messaggio",
    notifBuilding: "Edificio (opzionale)",
    notifRecipient: "Destinatario (opzionale)",
    allBuildingsOption: "Tutti gli edifici",
    allTenantsOption: "Tutti gli inquilini",
    newLabel: "Nuovo",
    markAsRead: "Segna come letto",
    confirmDeleteNotif: "Sei sicuro di voler eliminare questa notifica?",
    noNotifications: "Nessuna notifica",
    noNotifAdmin: "Inizia inviando una notifica ai tuoi inquilini",
    noNotifTenant: "Non hai notifiche al momento",
    alertTenants: "Avvisare inquilini",
    broadcastTitle: "Avvisare gli inquilini",
    broadcastSubject: "Oggetto",
    broadcastMessage: "Messaggio",
    recipients: "Destinatari",
    sendToAll: "Invia a tutti",
    today: "Oggi",
    yesterday: "Ieri",
    daysAgo: "{n} giorni fa",

    informationsTitle: "Informazioni",
    informationsSub: "Informazioni importanti per la gestione immobiliare",
    infoTenantTitle: "Informazioni sull'edificio",
    infoTenantSub: "Documenti e informazioni utili per la vostra residenza",
    referenceRate: "Tasso ipotecario di riferimento",
    referenceRateText: "Il tasso ipotecario di riferimento è passato dall'1.50% all'1.25%. Gli inquilini possono richiedere una riduzione dell'affitto basata sul loro ultimo tasso di riferimento applicabile.",
    cpiIndexation: "Indicizzazione IPC",
    cpiIndexationText: "Gli affitti possono essere adeguati secondo l'evoluzione dell'indice svizzero dei prezzi al consumo (IPC) se previsto contrattualmente.",
    maintenanceReserves: "Riserve di manutenzione raccomandate",
    maintenanceReservesText: "Prevedere tra lo 0.8% e l'1.2% del valore dell'immobile all'anno.",
    regulations: "Regolamento",
    buildingRules: "Regolamento dell'edificio (PDF)",
    laundryRules: "Regole della lavanderia (PDF)",
    wasteRules: "Istruzioni per lo smaltimento dei rifiuti (PDF)",
    usefulContacts: "Contatti utili",
    managementEmergency: "Amministrazione (Emergenze)",
    concierge: "Portiere",
    medicalEmergency: "Emergenze mediche",
    police: "Polizia",

    myProfile: "Il mio profilo",
    name: "Nome",
    role: "Ruolo",

    infoReferenceRate: "Tasso ipotecario di riferimento",
    infoReferenceRateDesc: "Il tasso ipotecario di riferimento è passato dall'1.50% all'1.25%. Gli inquilini possono richiedere una riduzione dell'affitto.",
    infoCpiIndex: "Indicizzazione IPC",
    infoCpiIndexDesc: "Tenete traccia della base IPC utilizzata nell'ultimo adeguamento.",
    infoRenewal: "Rinnovi e disdette",
    infoRenewalDesc: "Centralizzate le scadenze dei contratti. Programmate promemoria 60/30/15 giorni prima delle date chiave.",
    infoMaintenance: "Manutenzione proattiva",
    infoMaintenanceDesc: "Pianificate ispezioni periodiche: caldaie, ventilazione, rilevatori, parti comuni.",
    infoInsurance: "Assicurazioni e sinistri",
    infoInsuranceDesc: "Verificate copertura edificio, RC proprietario, danni da acqua, rottura vetri.",
    infoCharges: "Spese e rendiconti",
    infoChargesDesc: "Conservate fatture e chiavi di ripartizione. La trasparenza riduce le contestazioni.",
    infoVacancy: "Sfitto e commercializzazione",
    infoVacancyDesc: "Preparate un piano sfitto: foto, annuncio standard, visite.",
    infoDocumentation: "Documentazione inquilino",
    infoDocumentationDesc: "Standardizzate: verbali di consegna, inventario, comunicazioni importanti.",
    infoDisclaimer: "Queste informazioni sono indicative e non sostituiscono una consulenza legale professionale.",

    tagSwitzerland: "Svizzera",
    tagManagement: "Gestione",
    tagProcess: "Processo",
    tagExploitation: "Esercizio",
    tagRisk: "Rischio",
    tagFinance: "Finanza",
    tagRental: "Locazione",
    tagCompliance: "Conformità",

    tenantsOverview: "Panoramica degli inquilini per edificio",
    searchTenants: "Cerca inquilini...",
    tenantCount: "inquilini",
    occupancyLabel: "Occupazione",
    viewProfile: "Vedi profilo",
    contactTenant: "Contattare",
    addNote: "Aggiungi nota",
    viewRequests: "Vedi richieste",
    viewDocuments: "Documenti",
    leaseDetails: "Dettagli del contratto",
    financials: "Finanze",
    tenantSince: "Inquilino dal",
    leaseEnds: "Fine del contratto",
    totalMonthly: "Totale mensile",
    internalNotes: "Note interne",
    managementNotes: "Note di gestione e monitoraggio",
    writeNote: "Scrivi una nota...",
    noNotesYet: "Nessuna nota per ora",
    recentActivity: "Attività recente",
    noActivity: "Nessuna attività recente",
    openRequests: "Richieste aperte",
    closedRequests: "Richieste chiuse",
    leaving: "In partenza",

    requestsHub: "Richieste",
    requestsHubSub: "Gestisci le richieste di manutenzione e le candidature locative",
    maintenanceTab: "Manutenzione",
    rentalApplicationsTab: "Candidature",
    rentalApplications: "Domande di locazione",
    rentalApplicationsSub: "Gestisci le candidature dei futuri inquilini",
    newRentalApplication: "Nuova candidatura",
    applicantName: "Nome del candidato",
    applicantEmail: "Email",
    applicantPhone: "Telefono",
    desiredUnit: "Unità desiderata",
    desiredMoveIn: "Data di trasloco desiderata",
    monthlyIncome: "Reddito mensile",
    currentAddress: "Indirizzo attuale",
    applicationMessage: "Messaggio di candidatura",
    applicationStatus: "Stato della candidatura",
    received: "Ricevuta",
    underReview: "In esame",
    accepted: "Accettata",
    rejected: "Rifiutata",
    noApplications: "Nessuna candidatura",
    noApplicationsSub: "Le nuove candidature appariranno qui",
    reviewApplication: "Esaminare la candidatura",
    applicantInfo: "Informazioni del candidato",
    applicationDetails: "Dettagli della candidatura",
    householdSize: "Dimensione del nucleo familiare",
    applicantOccupation: "Professione",
    employer: "Datore di lavoro",
    applicationDate: "Data di candidatura",
    approve: "Approvare",
    reject: "Rifiutare",
    markUnderReview: "Mettere in esame",
    numberOfPersons: "persone",

    sendDocument: "Invia documento",
    sendDocumentTitle: "Invia documento",
    sendDocumentSub: "Invia un documento direttamente a",
    docType: "Tipo di documento",
    selectFile: "File",
    clickToSelectFile: "Clicca per selezionare un file",
    optionalMessage: "Messaggio (opzionale)",
    sendDocMessagePlaceholder: "Es: In allegato la checklist di consegna/riconsegna...",
    sendToTenant: "Invia all'inquilino",
    docSentNotifTitle: "Documento ricevuto",
    docSentNotifMessage: "Un documento ti è stato inviato:",

    lightMode: "Giorno",
    darkMode: "Notte",
    theme: "Tema",
  },
};
