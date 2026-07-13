"use client";

import { Camera, CheckCircle2, Images, LoaderCircle, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { Role } from "@/types/linride";

type ProfilePhotoSetupProps = {
  fullName: string;
  role: Role;
  currentPhotoUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
};

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const OUTPUT_SIZE = 1024;

function loadPhoto(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo format could not be opened. Choose a JPG, PNG, or WebP photo."));
    };
    image.src = url;
  });
}

async function prepareProfilePhoto(source: File) {
  if (!source.type.startsWith("image/")) throw new Error("Choose a picture from your camera or photo gallery.");
  if (source.size > MAX_SOURCE_BYTES) throw new Error("That picture is too large. Choose one smaller than 25 MB.");

  const image = await loadPhoto(source);
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("That picture appears to be empty or damaged.");

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - cropSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - cropSize) / 2);
  const outputSize = Math.min(OUTPUT_SIZE, cropSize);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo editing is not supported on this device.");
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("The photo could not be prepared. Try a different picture.");
  return new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export function ProfilePhotoSetup({ fullName, role, currentPhotoUrl, onUpload, onRemove }: ProfilePhotoSetupProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setPreparing(true);
    setMessage(null);
    try {
      setFile(await prepareProfilePhoto(selected));
    } catch (error) {
      setFile(null);
      setMessage(error instanceof Error ? error.message : "That photo could not be opened.");
    } finally {
      setPreparing(false);
    }
  }

  async function savePhoto() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      await onUpload(file);
      setFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile photo upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (currentPhotoUrl) {
    return (
      <section className="profile-photo-gate profile-photo-manager">
        <div className="profile-photo-manager-summary">
          <div className="profile-photo-gate-icon">
            <Image
              unoptimized
              width={72}
              height={72}
              src={preview || currentPhotoUrl}
              alt={preview ? "New profile preview" : `${fullName} profile`}
            />
          </div>
          <div>
            <p className="linride-eyebrow">Profile picture</p>
            <h2>{preview ? "Ready to replace" : fullName}</h2>
            <p>{preview ? "Save this picture to use it across Lin Ride." : "Keep this photo clear and current."}</p>
          </div>
        </div>

        <div className="profile-photo-manager-actions">
          <label className="profile-photo-picker">
            <Images size={17} />
            <span>Replace photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={choosePhoto} disabled={preparing || busy} />
          </label>
          <button
            type="button"
            className="profile-photo-remove"
            disabled={preparing || busy || !onRemove}
            onClick={async () => {
              if (!onRemove || !window.confirm("Remove your profile picture? You will need to add a new one before booking or going online.")) return;
              setBusy(true);
              setMessage(null);
              try {
                await onRemove();
                setFile(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Profile photo removal failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && !file ? <LoaderCircle size={17} className="profile-photo-spinner" /> : <Trash2 size={17} />}
            Remove photo
          </button>
        </div>

        {preparing && <p className="profile-photo-ready"><LoaderCircle size={15} className="profile-photo-spinner" /> Preparing photo...</p>}
        {file && !message && <p className="profile-photo-ready"><CheckCircle2 size={15} /> New photo ready</p>}
        {message && <p className="profile-photo-message" role="alert">{message}</p>}
        {file && (
          <button type="button" className="linride-submit profile-photo-save-replacement" disabled={preparing || busy} onClick={() => void savePhoto()}>
            {busy ? <LoaderCircle size={18} className="profile-photo-spinner mr-2 inline" /> : <Upload size={18} className="mr-2 inline" />}
            {busy ? "Saving photo..." : "Save new profile picture"}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="profile-photo-gate">
      <div className="profile-photo-gate-icon">
        {preview ? <Image unoptimized width={96} height={96} src={preview} alt="Profile preview" /> : preparing ? <LoaderCircle className="profile-photo-spinner" size={34} /> : <Camera size={34} />}
      </div>
      <p className="linride-eyebrow">Required profile picture</p>
      <h2>Add a clear photo, {fullName.split(" ")[0]}.</h2>
      <p>
        {role === "driver"
          ? "Passengers use this photo to recognize the correct driver. Your face should be clear and recent."
          : "Drivers use this photo to recognize the correct passenger at pickup."}
      </p>

      <div className="profile-photo-actions">
        <label className="profile-photo-picker">
          <Camera size={18} />
          <span>Take photo</span>
          <input type="file" accept="image/*" capture="user" onChange={choosePhoto} disabled={preparing || busy} />
        </label>
        <label className="profile-photo-picker">
          <Images size={18} />
          <span>Choose from gallery</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={choosePhoto} disabled={preparing || busy} />
        </label>
      </div>

      {file && !message && (
        <p className="profile-photo-ready"><CheckCircle2 size={15} /> Photo ready to upload</p>
      )}
      {message && <p className="profile-photo-message" role="alert">{message}</p>}
      <button
        type="button"
        className="linride-submit"
        disabled={!file || preparing || busy}
        onClick={() => void savePhoto()}
      >
        {busy ? <LoaderCircle size={18} className="profile-photo-spinner mr-2 inline" /> : <Upload size={18} className="mr-2 inline" />}
        {busy ? "Uploading photo..." : "Save profile picture"}
      </button>
    </section>
  );
}
