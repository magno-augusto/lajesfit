import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  compressImageDataUrl,
  dataUrlToBlob,
  isOlderAndroidBrowser,
  readFileAsDataUrl,
} from "./image-utils";
import { updateDietMealPhoto } from "./meals-api";
import type { MealGroup } from "./meal-grouping";

export function MealGroupPhoto({ group }: { group: MealGroup }) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState(group.photoUrl);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preferGallery, setPreferGallery] = useState(false);
  const canEditPhoto = Boolean(group.dietMealId);
  const totalCalories = group.items.reduce((sum, item) => sum + item.calories, 0);

  useEffect(() => {
    setPhotoUrl(group.photoUrl);
  }, [group.photoUrl]);

  useEffect(() => {
    setPreferGallery(isOlderAndroidBrowser());
  }, []);

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPickerOpen(false);
    if (!file || !group.dietMealId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem valida");
      return;
    }

    setSaving(true);
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const dataUrl = await compressImageDataUrl(rawDataUrl);
      const photoBlob = await dataUrlToBlob(dataUrl);
      const nextPhotoUrl = await updateDietMealPhoto(group.dietMealId, photoBlob);
      setPhotoUrl(nextPhotoUrl);
      toast.success("Foto da refeicao atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar a foto");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    if (!group.dietMealId) return;

    setSaving(true);
    try {
      await updateDietMealPhoto(group.dietMealId, null);
      setPhotoUrl(null);
      toast.success("Foto da refeicao removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a foto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pickPhoto}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={preferGallery ? undefined : "environment"}
        className="hidden"
        onChange={pickPhoto}
      />
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-44 w-full rounded-md object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImageIcon className="size-6" />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {group.items.length} item(ns) - {Math.round(totalCalories)} kcal
        </p>
        {canEditPhoto && (
          <div className="flex gap-2">
            {pickerOpen ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={saving}
                >
                  <ImageIcon className="mr-1 size-4" />
                  Galeria
                </Button>
                {!preferGallery && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={saving}
                  >
                    <Camera className="mr-1 size-4" />
                    Camera
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={saving}
              >
                {photoUrl ? "Trocar foto" : "Adicionar foto"}
              </Button>
            )}
            {photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removePhoto}
                disabled={saving}
              >
                Remover
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
