// File: app/dashboard/profile/page.tsx
"use client";

import React, { useEffect } from "react";
import useSWR from "swr";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  CircularProgress,
} from "@mui/material";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Fetch error");
    return res.json();
  });

export default function ProfilePage() {
  const { data: session, status } = useSession();
  // 1) Show spinner while NextAuth is loading
  if (status === "loading") {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  // 2) If not signed in, you could redirect or show a message
  if (!session?.user?.id) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">You must be signed in to view this page.</Typography>
      </Box>
    );
  }

  // 3) Fetch the profile from your customer endpoint
  const { data, error } = useSWR<{ profile: any }>(
    "/api/customer/dashboard",
    fetcher
  );

  // 4) Error toast
  useEffect(() => {
    if (error) toast.error("Failed to load profile.");
  }, [error]);

  // 5) Loading state
  if (!data && !error) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // 6) Not found
  if (error || !data?.profile) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Profile not found.</Typography>
      </Box>
    );
  }

  // 7) Build address lines (same as before)
  const p = data.profile;
  const street = p.streetAddress?.trim();
  const apt    = p.aptSuite?.trim();
  const city   = p.city?.trim();
  const state  = p.state?.trim();
  const zip    = p.zip?.trim();
  const country= p.country?.trim() ?? "USA";

  let addressLines: string[] = [];
  if (street || apt || city || state || zip) {
    const line1 = [street, apt ? `Apt. ${apt}` : null]
      .filter(Boolean)
      .join(" ");
    const line2 = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
    addressLines = [line1, line2, country].filter(Boolean);
  } else if (p.address) {
    addressLines = p.address
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  return (
    <Box
      sx={{
        p: 4,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Card sx={{ width: { xs: "100%", sm: 400 } }}>
        <CardContent sx={{ textAlign: "center" }}>
          {p.photoUrl && (
            <Avatar
              src={p.photoUrl}
              sx={{ width: 88, height: 88, mx: "auto", mb: 2 }}
            />
          )}

          <Typography variant="h5" gutterBottom>
            {p.firstName} {p.lastName}
          </Typography>

          <Typography variant="body1" gutterBottom>
            {p.email}
          </Typography>

          {p.phone && (
            <Typography variant="body1" gutterBottom>
              Phone: {p.phone}
            </Typography>
          )}

          {addressLines.map((line, i) => (
            <Typography key={i} variant="body1" gutterBottom>
              {line}
            </Typography>
          ))}

          {p.licenseNumber && (
            <>
              <Typography variant="body1" gutterBottom>
                License #: {p.licenseNumber}
              </Typography>
              <Typography variant="body1">
                Vehicle: {p.carMakeModel}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
