import type {
  AvatarSettings,
  FestivalPhoto,
  FestivalPreferences,
  FestivalWish,
  KrathongSettings
} from "@/lib/types/festival";

const STORAGE_KEYS = {
  avatar: "lkfw:avatar:v1",
  krathong: "lkfw:krathong:v1",
  preferences: "lkfw:preferences:v1",
  wishes: "lkfw:wishes:v1",
  designs: "lkfw:designs:v1"
} as const;

const DATABASE_NAME = "loy-krathong-fantasy-world";
const DATABASE_VERSION = 1;
const PHOTO_STORE = "photos";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readLocalValue<T>(key: keyof typeof STORAGE_KEYS, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalValue<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.error("Unable to save local festival data.", error);
  }
}

export function saveAvatar(value: AvatarSettings): void {
  writeLocalValue("avatar", value);
}

export function saveKrathong(value: KrathongSettings): void {
  writeLocalValue("krathong", value);
}

export function savePreferences(value: FestivalPreferences): void {
  writeLocalValue("preferences", value);
}

export function saveWishes(value: FestivalWish[]): void {
  writeLocalValue("wishes", value);
}

function openPhotoDatabase(): Promise<IDBDatabase> {
  if (!isBrowser() || !("indexedDB" in window)) {
    return Promise.reject(new Error("Local photo storage is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        database.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local photo storage."));
    request.onblocked = () => reject(new Error("Photo storage is blocked by another open tab."));
  });
}

export async function savePhoto(blob: Blob): Promise<FestivalPhoto> {
  const database = await openPhotoDatabase();
  const photo: FestivalPhoto = {
    id: crypto.randomUUID(),
    blob,
    createdAt: new Date().toISOString()
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readwrite");
    transaction.objectStore(PHOTO_STORE).put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save photo."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Photo save was cancelled."));
  });

  database.close();
  return photo;
}

export async function listPhotos(): Promise<FestivalPhoto[]> {
  const database = await openPhotoDatabase();

  const photos = await new Promise<FestivalPhoto[]>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readonly");
    const request = transaction.objectStore(PHOTO_STORE).getAll();
    request.onsuccess = () => resolve(request.result as FestivalPhoto[]);
    request.onerror = () => reject(request.error ?? new Error("Could not load photos."));
  });

  database.close();
  return photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deletePhoto(id: string): Promise<void> {
  const database = await openPhotoDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readwrite");
    transaction.objectStore(PHOTO_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete photo."));
  });

  database.close();
}
