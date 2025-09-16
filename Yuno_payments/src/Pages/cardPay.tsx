

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { loadScript } from "@yuno-payments/sdk-web";

interface CardFormProps {
  orderId?: string;
  checkoutSessionId?: string;
  countryCode?: 'US' | 'CO' | 'BR' | 'AR' | 'CL';
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  customerName?: string; // Corrected to a single prop for consistency
  customerEmail?: string;
}

interface YunoInstance {
  secureFields: (cfg: { countryCode: string; checkoutSession: string }) => Promise<SecureFieldInstance>;
}

interface SecureFieldInstance {
  create: (
    cfg: { name: 'pan' | 'expiration' | 'cvv'; options?: { label?: string; showError?: boolean } }
  ) => { render: (selector: string) => void };
  generateToken: (payload: {
    cardHolderName: string;
    customer?: {
      name?: string;
      email?: string;
      document?: { document_number?: string; document_type?: string };
    };
  }) => Promise<{ token?: string; one_time_token?: string; oneTimeToken?: string }>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Yuno: any }
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "http://localhost:5000";

// A mock implementation for getCountryData

const getCountryData = (countryCode: string) => {

  return {
    documentNumber: "123456789",
    documentType: "CC"
  };
};

const CardForm: React.FC<CardFormProps> = ({ orderId, checkoutSessionId, countryCode, showMessage, onSuccess, onError, customerFirstName,customerLastName, customerEmail,yunoCustomerId ,setShowCheckout}) => {
  const [yuno, setYuno] = useState<YunoInstance | null>(null);
  const [secureFields, setSecureFields] = useState<SecureFieldInstance | null>(null);
  const [customerSession, setCustomerSession] = useState<string | null>(checkoutSessionId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [secureReady, setSecureReady] = useState(false);

  const [holder, setHolder] = useState("");
  console.log(customerFirstName,customerLastName,customerEmail,yunoCustomerId,"PAYLOAD in SDK")
  const initSdk = useCallback(async () => {
    const publicKey = import.meta.env.VITE_YUNO_PUBLIC_KEY as string | undefined;
    if (!publicKey) {
      setError("Missing VITE_YUNO_PUBLIC_KEY env var");
      return;
    }
    try {
      setLoading(true);
      await loadScript();
      setSdkLoaded(true);
      const yunoGlobal = window.Yuno as { initialize: (key: string) => Promise<unknown> };
      const instance = (await yunoGlobal.initialize(publicKey)) as unknown as { secureFields: YunoInstance['secureFields'] };
      setYuno(instance as YunoInstance);
      setError(null);
    } catch (e: unknown) {
      setError("Failed to load/initialize Yuno SDK");
      console.error("SDK init failure:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onReady = () => setSdkLoaded(true);
    const onErrorEvt = (evt: Event) => {
      setSdkLoaded(false);
      setError((evt as CustomEvent)?.detail?.message || "SDK load error");
    };
    window.addEventListener("yuno-sdk-ready", onReady as EventListener);
    window.addEventListener("yuno-sdk-error", onErrorEvt as EventListener);
    initSdk();
    return () => {
      window.removeEventListener("yuno-sdk-ready", onReady as EventListener);
      window.removeEventListener("yuno-sdk-error", onErrorEvt as EventListener);
    };
  }, [initSdk]);

  useEffect(() => {
    if (checkoutSessionId) setCustomerSession(checkoutSessionId);
  }, [checkoutSessionId]);

  useEffect(() => {
    const setupSecureFields = async () => {
      if (!yuno || !customerSession) return;
      try {
        const cc = countryCode || 'US';
        const instance = await yuno.secureFields({ countryCode: cc, checkoutSession: customerSession });
        setSecureFields(instance);

        const pan = instance.create({ name: 'pan', options: { label: 'Card Number', showError: true } });
        const expiration = instance.create({ name: 'expiration', options: { label: 'MM/YY', showError: true } });
        const cvvField = instance.create({ name: 'cvv', options: { label: 'CVV', showError: true } });

        pan.render('#sf-pan');
        expiration.render('#sf-expiration');
        cvvField.render('#sf-cvv');
        setSecureReady(true);
      } catch (e) {
        setError('Secure fields failed to initialize');
        console.error('Secure fields init error:', e);
      }
    };
    setupSecureFields();
  }, [yuno, customerSession, countryCode]);
 const handleSecureFieldsPay = async () => {
  try {
    if (!secureFields || !customerSession) {
      setError("Secure fields not ready");
      return;
    }

    if (!holder.trim()) {
      setError("Enter cardholder name");
      return;
    }

    // 🔑 Token generate using props
    const tokenResp = await secureFields.generateToken({
      cardHolderName: holder.trim(),
      customer: {
        id: yunoCustomerId,          
        name: customerFirstName?.trim(),  // 👈 Prop
        email: customerEmail?.trim(),// 👈 Prop
        document: {
          document_number: "123456789", 
          document_type: "CC"           
        }
      }
    });

    console.log("Token Response:", tokenResp);

    const oneTimeToken =
      tokenResp?.one_time_token ||
      tokenResp?.token ||
      (typeof tokenResp === "string" ? tokenResp : null);

    if (!oneTimeToken) {
      throw new Error("Failed to generate one-time token");
    }

    // 🔑 Hit backend
    const paymentResp = await axios.post(`${API_BASE}/api/payments/create-payment`, {
      orderId,
      customer_session: customerSession,
      oneTimeToken,
      yunoCustomerId, // bhej dena backend ko bhi
    });

    console.log("Payment response:", paymentResp.data);
    onSuccess?.(paymentResp.data);
    if(paymentResp.data.status === "SUCCEEDED"){
      setShowCheckout(false);
      showMessage( 'Payment Sucess', 'sucess')
    }


  } catch (e: unknown) {
    console.error("generateToken or create-payment error:", e);
    const message = (e as { message?: string })?.message || "Payment error";
    setError(message);
    onError?.(new Error(message));
  }
};

  return (
    <div>
      {/* {error && (
        <div style={{ marginBottom: 12, color: "#b00020" }}>{error}</div>
      )} */}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <button type="button" disabled={loading} onClick={initSdk}>
          {sdkLoaded ? "Reload SDK" : loading ? "Loading SDK..." : "Load SDK"}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <div id="sf-pan" />
        <div id="sf-expiration" />
        <div id="sf-cvv" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            placeholder="Cardholder Name"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
          <button type="button" onClick={handleSecureFieldsPay} disabled={!secureReady}>
            Pay
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardForm;