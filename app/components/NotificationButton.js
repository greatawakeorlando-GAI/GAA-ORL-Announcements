"use client";

import { useEffect, useState } from "react";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

// Detects "installed" PWA mode (standalone display), which is what iOS
// requires before push notifications work at all.
function useIsStandalone() {
  const [standalone, setStandalone] = useState(true); // assume true until checked, avoids a flash
  useEffect(() => {
    const isIOSStandalone = window.navigator.standalone === true;
    const isDisplayModeStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    setStandalone(isIOSStandalone || isDisplayModeStandalone);
  }, []);
  return standalone;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function NotificationButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const standalone = useIsStandalone();
  const onIOS = isIOS();

  useEffect(() => {
    setSupported(isPushSupported());
    getExistingSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  async function handleToggle() {
    setLoading(true);
    setError("");
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    // Most likely: iPhone/iPad where the site hasn't been added to the
    // Home Screen yet. Safari only exposes push notifications to installed
    // PWAs, not to a regular browser tab.
    if (onIOS && !standalone) {
      return (
        <div className="banner">
          <span>
            To get announcement alerts on iPhone: tap the Share icon, then{" "}
            <strong>Add to Home Screen</strong> -- then open the app from
            there and turn on notifications.
          </span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="stack" style={{ marginBottom: 18 }}>
      <button
        className={subscribed ? "btn secondary" : "btn"}
        onClick={handleToggle}
        disabled={loading}
      >
        {loading
          ? "Please wait..."
          : subscribed
          ? "Notifications on -- tap to turn off"
          : "Turn on announcement alerts"}
      </button>
      {error && (
        <span className="text-muted" style={{ color: "#a3323b" }}>
          {error}
        </span>
      )}
    </div>
  );
}
