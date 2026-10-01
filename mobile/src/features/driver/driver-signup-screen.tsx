import { normalizeSriLankanPhone, registerSchema, type VehicleType } from "@farm-pool/shared";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { driverApi } from "@/features/driver/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

import { OnboardingShell } from "./components/onboarding/onboarding-shell";
import { Step1Phone } from "./components/onboarding/step-1-phone";
import { RESEND_SECONDS, Step2Code } from "./components/onboarding/step-2-code";
import { Step3Vehicle } from "./components/onboarding/step-3-vehicle";
import { Step4Documents, type DocumentId } from "./components/onboarding/step-4-documents";
import { StepDone } from "./components/onboarding/step-done";
import { generatePassword, requestCode, verifyCode } from "./sms-code";
import { vehicleById } from "./vehicles";

/**
 * A delivery partner's sign-up, all four steps and the confirmation
 * (Figma 196:6238, 196:6269, 196:6306, 196:6361, 196:6409).
 *
 * One screen holding five views, rather than five routes, because the steps share one draft that
 * only becomes an account at the very end: the api is not touched until "Send for approval", so
 * a driver who abandons halfway leaves nothing behind. The same reason the vehicle wizard
 * (FARM-45) is built this way.
 *
 * TWO FIELDS ARE HERE THAT ARE NOT IN THE FIGMA, both forced and both flagged in the step files:
 * the driver's **name** (step 1) and their **district** (step 3). `registerSchema` requires a
 * name, the farmer's pickup check shows it (LP-04), and the job board filters on district — a
 * driver without one finishes sign-up and lands on a permanently empty Jobs tab.
 */
type Step = 1 | 2 | 3 | 4 | "done";

type Documents = Record<DocumentId, string | null>;

export function DriverSignUpScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [registration, setRegistration] = useState("");
  const [district, setDistrict] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Documents>({ licence: null, nationalId: null });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendIn, setResendIn] = useState(0);

  /* One interval for the resend countdown, cleared on unmount so a driver who leaves mid-code
     does not keep a timer alive behind the navigator. */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startCountdown = useCallback(() => {
    setResendIn(RESEND_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setResendIn((seconds) => {
        if (seconds <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, seconds - 1);
      });
    }, 1000);
  }, []);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const normalized = normalizeSriLankanPhone(`0${phone.replace(/\D/g, "").replace(/^0/, "")}`);

  const fail = (field: string, message: string) => {
    setErrors({ [field]: message });
    return false;
  };

  /* ── step 1 → 2 ─────────────────────────────────────────────────────────── */
  const sendCode = async () => {
    setErrors({});
    if (displayName.trim().length < 2) return fail("displayName", "Enter your name");
    if (!normalized) return fail("phone", "Enter a Sri Lankan mobile number, like 77 123 4567");

    setBusy(true);
    try {
      await requestCode(normalized);
      startCountdown();
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  /* ── step 2 → 3 ─────────────────────────────────────────────────────────── */
  const verify = async (entered = code) => {
    setErrors({});
    setBusy(true);
    try {
      const ok = await verifyCode(normalized ?? "", entered);
      if (!ok) return fail("code", "That code is not right. Check the SMS and try again.");
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  /* ── step 3 → 4 ─────────────────────────────────────────────────────────── */
  const confirmVehicle = () => {
    setErrors({});
    if (!vehicleType) return fail("vehicleType", "Pick the vehicle you drive");
    if (registration.trim().length < 4)
      return fail("registration", "Enter the number on the plate");
    if (!district) return fail("operatingDistrict", "Pick the district you collect in");
    setStep(4);
  };

  /* ── step 4 → done: the only point the api is touched ───────────────────── */
  const submit = async () => {
    setErrors({});
    if (!normalized || !vehicleType || !district) return;

    const input = {
      displayName: displayName.trim(),
      phone: normalized,
      password: generatePassword(),
      role: "logistics" as const
    };
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(String(issue.path[0] ?? "phone"), issue.message);
    }

    setBusy(true);
    try {
      /* The token comes back from `signUp` rather than off the context: this closure captured
         `auth` before the sign-in, so `auth.token` is still null here. */
      const { token } = await auth.signUp(input);
      /* The account exists and the session is live, so the vehicle goes on it immediately —
         without one the `(driver)` guard stays shut and the driver cannot reach the tabs. */
      const user = await driverApi.saveVehicle(token, {
        vehicleType,
        registration: registration.trim(),
        capacityKg: vehicleById(vehicleType).capacityKg,
        operatingDistrict: district
      });
      auth.updateUser(user);
      setStep("done");
    } catch (error) {
      if (error instanceof ApiError && error.code === "phone_taken") {
        setStep(1);
        return fail("phone", "An account with this number already exists. Log in instead.");
      }
      setErrors({
        form:
          error instanceof ApiError && error.code === "network_error"
            ? "Can't reach the server. Check your connection and try again."
            : "Could not finish sign-up. Please try again."
      });
    } finally {
      setBusy(false);
    }
  };

  /* Documents are captured but never uploaded: no endpoint and no object storage exist
     (`.plans/DATA-MODEL.md`, "Not modelled yet"). The uri is held so the row can show "Photo
     added" truthfully; it goes no further than this screen. */
  const capture = async (id: DocumentId) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrors({ documents: "Allow camera access to photograph your documents." });
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (shot.canceled) return;
    setErrors({});
    setDocuments((current) => ({ ...current, [id]: shot.assets[0].uri }));
  };

  if (step === "done") {
    return (
      <StepDone
        phone={normalized ?? ""}
        vehicleLabel={vehicleType ? vehicleById(vehicleType).label : ""}
        registration={registration.trim()}
        onSeeJobs={() => router.replace("/driver-jobs")}
      />
    );
  }

  const back = () => (step === 1 ? router.back() : setStep((step - 1) as Step));

  return (
    <OnboardingShell step={step} onBack={back} footer={footerFor(step)}>
      {step === 1 ? (
        <Step1Phone
          displayName={displayName}
          onChangeDisplayName={setDisplayName}
          phone={phone}
          onChangePhone={setPhone}
          errors={errors}
          onSubmit={sendCode}
        />
      ) : null}

      {step === 2 ? (
        <Step2Code
          phone={normalized ?? ""}
          code={code}
          onChangeCode={setCode}
          onComplete={verify}
          error={errors.code}
          resendIn={resendIn}
          onResend={() => void requestCode(normalized ?? "").then(startCountdown)}
          onVoiceCall={() => void requestCode(normalized ?? "").then(startCountdown)}
        />
      ) : null}

      {step === 3 ? (
        <Step3Vehicle
          vehicleType={vehicleType}
          onSelectVehicle={setVehicleType}
          registration={registration}
          onChangeRegistration={setRegistration}
          district={district}
          onSelectDistrict={setDistrict}
          errors={errors}
        />
      ) : null}

      {step === 4 ? (
        <Step4Documents
          captured={documents}
          onCapture={capture}
          error={errors.documents ?? errors.form}
        />
      ) : null}
    </OnboardingShell>
  );

  function footerFor(current: Exclude<Step, "done">) {
    const label = {
      1: busy ? "Sending…" : "Send code",
      2: busy ? "Checking…" : "Verify",
      3: "Continue",
      4: busy ? "Sending…" : "Send for approval"
    }[current];

    const onPress = { 1: sendCode, 2: () => verify(), 3: confirmVehicle, 4: submit }[current];

    /* Photos are not required to finish. The design's own note says they upload later when
       there is signal, so blocking on them would strand a driver with no connection at the one
       step that matters most. */
    return <AppButton label={label} disabled={busy} onPress={() => void onPress()} />;
  }
}
