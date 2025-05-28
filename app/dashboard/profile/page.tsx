// File: app/dashboard/profile/page.tsx
"use client";

import React from "react";
import useSWR from "swr";
import { toast } from "react-toastify";
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
  const userId = 1; // or pull from your auth/session
  const { data, error } = useSWR(`/api/users/${userId}`, fetcher);

  React.useEffect(() => {
    if (error) toast.error("Failed to load profile");
  }, [error]);

  if (!data && !error) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Profile not found.</Typography>
      </Box>
    );
  }

  // Determine address lines
  // Prefer individual fields, but fall back to raw `data.address` if present
  const street = data.streetAddress?.trim();
  const apt = data.aptSuite?.trim();
  const city = data.city?.trim();
  const state = data.state?.trim();
  const zip = data.zip?.trim();
  const country = data.country?.trim() ?? "USA";

  let addressLines: string[] = [];

  if (street || apt || city || state || zip) {
    // build from components
    const line1 = [street, apt ? `Apt. ${apt}` : null]
      .filter(Boolean)
      .join(" ");
    const line2 = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
    addressLines = [line1, line2, country].filter(Boolean);
  } else if (data.address) {
    // fallback: split raw address string by commas
    addressLines = data.address
      .split(",")
      .map((segment: string) => segment.trim())
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
          {data.driverProfile?.photoUrl && (
            <Avatar
              src={data.driverProfile.photoUrl}
              sx={{ width: 88, height: 88, mx: "auto", mb: 2 }}
            />
          )}

          <Typography variant="h5" gutterBottom>
            {data.firstName} {data.lastName}
          </Typography>

          <Typography variant="body1" gutterBottom>
            {data.email}
          </Typography>

          {data.phone && (
            <Typography variant="body1" gutterBottom>
              Phone: {data.phone}
            </Typography>
          )}

          {/* Render each address line on its own Typography */}
          {addressLines.map((line, idx) => (
            <Typography key={idx} variant="body1" gutterBottom>
              {line}
            </Typography>
          ))}

          {data.driverProfile && (
            <>
              <Typography variant="body1" gutterBottom>
                License #: {data.driverProfile.licenseNumber}
              </Typography>
              <Typography variant="body1">
                Vehicle: {data.driverProfile.carMakeModel}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
