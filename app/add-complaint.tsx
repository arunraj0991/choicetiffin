import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import COLORS from "@/constants/colors";
import { editComplaint, resolveImageUrl, saveComplaint } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

function toBase64Image(asset: ImagePicker.ImagePickerAsset) {
  if (!asset?.base64) return "";
  const mime = asset.mimeType || "image/jpeg";
  return `data:${mime};base64,${asset.base64}`;
}

export default function AddComplaintScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    complaint_id?: string;
    subject?: string;
    complaint?: string;
    image?: string;
  }>();

  const complaintId = firstParam(params.complaint_id);
  const isEdit = !!complaintId;

  const [subject, setSubject] = useState("");
  const [complaint, setComplaint] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubject(firstParam(params.subject));
    setComplaint(firstParam(params.complaint));
    const image = firstParam(params.image);
    setExistingImage(image);
    setImagePreview(resolveImageUrl(image, "complaints") || "");
    setImageBase64("");
    setErrors({});
  }, [params.complaint, params.complaint_id, params.image, params.subject]);

  const applyPickedAsset = (asset?: ImagePicker.ImagePickerAsset) => {
    if (!asset) return;
    const encoded = toBase64Image(asset);
    if (!encoded) {
      Alert.alert(t("error"), t("failedPickImage"));
      return;
    }
    setImageBase64(encoded);
    setImagePreview(asset.uri || encoded);
  };

  const ensureLibraryPermission = async () => {
    const { status: existingStatus } =
      await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert(t("permissionRequired"), t("photoPermissionMsg"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("ok"), onPress: () => Linking.openSettings() },
      ]);
      return false;
    }
    return true;
  };

  const ensureCameraPermission = async () => {
    const { status: existingStatus } =
      await ImagePicker.getCameraPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert(t("permissionRequired"), t("cameraPermissionMsg"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("ok"), onPress: () => Linking.openSettings() },
      ]);
      return false;
    }
    return true;
  };

  const pickFromLibrary = async () => {
    try {
      const allowed = await ensureLibraryPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled) applyPickedAsset(result.assets?.[0]);
    } catch {
      Alert.alert(t("error"), t("failedPickImage"));
    }
  };

  const pickFromCamera = async () => {
    try {
      const allowed = await ensureCameraPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled) applyPickedAsset(result.assets?.[0]);
    } catch {
      Alert.alert(t("error"), t("failedTakePhoto"));
    }
  };

  const pickImage = () => {
    Alert.alert(t("complaintImage"), t("choosePhotoSource"), [
      { text: t("takePhoto"), onPress: pickFromCamera },
      { text: t("chooseFromGallery"), onPress: pickFromLibrary },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!subject.trim()) nextErrors.subject = t("subjectRequired");
    if (!complaint.trim()) nextErrors.complaint = t("complaintRequired");
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const payload: {
          complaint_id: string;
          subject: string;
          complaint: string;
          image?: string;
        } = {
          complaint_id: complaintId,
          subject: subject.trim(),
          complaint: complaint.trim(),
        };
        if (imageBase64) payload.image = imageBase64;
        const res = await editComplaint(payload);
        if (res?.status === false) {
          Alert.alert(t("error"), res?.message || t("failedSaveComplaint"));
          return;
        }
        Alert.alert(t("success"), t("complaintUpdated"), [
          { text: t("ok"), onPress: () => router.back() },
        ]);
      } else {
        const payload: {
          subject: string;
          complaint: string;
          user_type: string;
          image?: string;
        } = {
          subject: subject.trim(),
          complaint: complaint.trim(),
          user_type: "user",
        };
        if (imageBase64) payload.image = imageBase64;
        const res = await saveComplaint(payload);
        if (res?.status === false) {
          Alert.alert(t("error"), res?.message || t("failedSaveComplaint"));
          return;
        }
        Alert.alert(t("success"), t("complaintSubmitted"), [
          { text: t("ok"), onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(t("error"), t("failedSaveComplaint"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? t("editComplaint") : t("addComplaint")}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>{t("complaintSubject")}</Text>
          <TextInput
            style={[styles.input, errors.subject && styles.inputError]}
            value={subject}
            onChangeText={(value) => {
              setSubject(value);
              setErrors((prev) => ({ ...prev, subject: "" }));
            }}
            placeholder={t("complaintSubject")}
            placeholderTextColor="#9CA3AF"
          />
          {!!errors.subject && (
            <Text style={styles.errorText}>{errors.subject}</Text>
          )}

          <Text style={styles.label}>{t("complaintDescription")}</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.complaint && styles.inputError,
            ]}
            value={complaint}
            onChangeText={(value) => {
              setComplaint(value);
              setErrors((prev) => ({ ...prev, complaint: "" }));
            }}
            placeholder={t("complaintDescription")}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
          {!!errors.complaint && (
            <Text style={styles.errorText}>{errors.complaint}</Text>
          )}

          <Text style={styles.label}>{t("complaintImage")}</Text>
          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {imagePreview ? (
              <>
                <Image source={{ uri: imagePreview }} style={styles.preview} />
                <View style={styles.changeBadge}>
                  <MaterialIcons name="photo-camera" size={16} color="#fff" />
                  <Text style={styles.changeText}>{t("changeImage")}</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={28} color={PRIMARY} />
                <Text style={styles.attachText}>{t("attachImage")}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isEdit && existingImage && !imageBase64 ? (
            <Text style={styles.hint}>{t("keepExistingImage")}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isEdit ? t("updateComplaint") : t("submitComplaint")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#130e1b",
  },
  body: { flex: 1, backgroundColor: COLORS.secondary },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#130e1b",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#130e1b",
    borderWidth: 1,
    borderColor: "transparent",
  },
  textArea: { minHeight: 120 },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 6 },
  imageBox: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee",
  },
  preview: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  attachText: { fontSize: 13, fontWeight: "700", color: PRIMARY },
  changeBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hint: { fontSize: 12, color: "#888", marginTop: 8 },
  submitBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
