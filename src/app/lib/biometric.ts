// Lightweight biometric "app lock" using WebAuthn's platform authenticator.
// Security model: this is a UX-level lock, not a cryptographic auth bind.
// Anyone with physical access to the device could technically clear
// localStorage, but the same is true for native banking apps' pincodes.
// Real passwordless auth would require server-side signature verification —
// left as a follow-up (see project_team_invitation memory for a related
// auth flow we may build).

const STORAGE_KEY = "palier_biometric_lock_v1";

interface BiometricState {
  credentialId: string; // base64url
  userId: string;
  enabledAt: string;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuf(s: string): ArrayBuffer {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomChallenge(bytes = 32): Uint8Array {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return arr;
}

export function biometricSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    "credentials" in navigator &&
    typeof navigator.credentials.create === "function"
  );
}

export async function biometricAvailable(): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    // @ts-ignore — Chrome / Safari platform authenticator query
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return !!available;
  } catch {
    return false;
  }
}

export function getStoredBiometricState(): BiometricState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BiometricState;
  } catch {
    return null;
  }
}

export function biometricEnabled(userId: string): boolean {
  const state = getStoredBiometricState();
  return !!state && state.userId === userId;
}

export async function enableBiometric(params: {
  userId: string;
  userName: string;
  displayName: string;
}): Promise<void> {
  if (!(await biometricAvailable())) {
    throw new Error("Ce navigateur ou cet appareil ne supporte pas l'authentification biométrique.");
  }

  const challenge = randomChallenge();
  const userIdBytes = new TextEncoder().encode(params.userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Palier", id: window.location.hostname },
      user: { id: userIdBytes, name: params.userName, displayName: params.displayName },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Création annulée.");

  const state: BiometricState = {
    credentialId: bufToBase64Url(credential.rawId),
    userId: params.userId,
    enabledAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function disableBiometric(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function requestBiometricUnlock(): Promise<boolean> {
  const state = getStoredBiometricState();
  if (!state) return false;

  const challenge = randomChallenge();

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        rpId: window.location.hostname,
        userVerification: "required",
        allowCredentials: [
          {
            id: base64UrlToBuf(state.credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return false;

    // Verify that the authenticator reported user-verified flag.
    const response = assertion.response as AuthenticatorAssertionResponse;
    const authData = new Uint8Array(response.authenticatorData);
    // authData flags byte is at index 32; UV (user verified) is bit 2 (0x04).
    const flags = authData[32];
    const userVerified = (flags & 0x04) !== 0;
    return userVerified;
  } catch {
    return false;
  }
}
