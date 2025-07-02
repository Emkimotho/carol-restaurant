/* ------------------------------------------------------------------ */
/*  File: components/Menu/Menu.tsx                                    */
/* ------------------------------------------------------------------ */
/*  • Keeps track of last-visited category per section (localStorage). */
/*  • When a user clicks a dish we append  ?from=main  or  ?from=golf  */
/*    so the Item-detail page knows which flow to use.                */
/*  • Default to ASAP when store is open (no pop-up).                 */
/* ------------------------------------------------------------------ */

"use client";

import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import { Tabs, Tab } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./Menu.module.css";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CartContext } from "@/contexts/CartContext";
import { OpeningHoursContext } from "@/contexts/OpeningHoursContext";
import MenuItemComponent from "@/components/MenuItem/MenuItem";
import MenuTimingBar from "@/components/MenuTimingBar/MenuTimingBar";
import type {
  MenuItem as MenuItemType,
  MenuCategory,
} from "@/utils/types";

const ScheduleOrderModal = dynamic(
  () => import("@/components/ScheduleOrderModal/ScheduleOrderModal"),
  { ssr: false }
);

const MenuItem = React.memo(MenuItemComponent);

interface MenuProps {
  slug: string[]; // [section, categoryId?]
}

/* =================================================================== */
export default function Menu({ slug }: MenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ------------------------ context ------------------------------ */
  const { setOrderStatus, setScheduledTime } =
    useContext(CartContext)!;
  const { isOpen } = useContext(OpeningHoursContext)!;

  /* ------------------------ state -------------------------------- */
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  /* remember last category per section (by id) */
  const [lastCat, setLastCat] = useState<{ MainMenu: string; GolfMenu: string }>(
    { MainMenu: "", GolfMenu: "" }
  );
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastMenuCategories");
      if (raw) setLastCat(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistLast = useCallback(
    (section: "MainMenu" | "GolfMenu", id: string) => {
      const upd = { ...lastCat, [section]: id };
      setLastCat(upd);
      localStorage.setItem("lastMenuCategories", JSON.stringify(upd));
    },
    [lastCat]
  );

  /* ------------------------ data --------------------------------- */
  const { data, error, isLoading } = useQuery<MenuItemType[]>({
    queryKey: ["menuItems"],
    queryFn: async () => {
      const r = await fetch("/api/menu/item");
      if (!r.ok) throw new Error("fetch failed");
      return (await r.json()).menuItems as MenuItemType[];
    },
    staleTime: 60_000,
  });
  const menuItems = data || [];

  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["menuItems"],
      queryFn: async () => {
        const r = await fetch("/api/menu/item");
        if (!r.ok) throw new Error("fetch failed");
        return (await r.json()).menuItems as MenuItemType[];
      },
      staleTime: 60_000,
    });
  }, [queryClient]);

  /* ------------------- derived lists ----------------------------- */
  const mainItems = useMemo(
    () =>
      menuItems.filter(
        (m) => m.category?.type === "MainMenu" && !m.category.hidden
      ),
    [menuItems]
  );
  const mainCats = useMemo(() => {
    const map = new Map<string, MenuCategory>();
    mainItems.forEach((m) => m.category && map.set(m.category.id, m.category));
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [mainItems]);

  const golfItems = useMemo(
    () =>
      menuItems.filter(
        (m) =>
          (m.category?.type === "GolfMenu" || m.showInGolfMenu) &&
          !m.category.hidden
      ),
    [menuItems]
  );
  const golfCats = useMemo(() => {
    const map = new Map<string, MenuCategory>();
    golfItems.forEach((m) => m.category && map.set(m.category.id, m.category));
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [golfItems]);

  /* -------------- routing helpers ------------------------------- */
  const activeSection = slug[0] || "MainMenu";
  const mainDefaultId = lastCat.MainMenu || mainCats[0]?.id || "";
  const golfDefaultId = lastCat.GolfMenu || golfCats[0]?.id || "";
  const activeCatId =
    activeSection === "MainMenu"
      ? slug[1] || mainDefaultId
      : slug[1] || golfDefaultId;

  /* -- top-level tabs (Main vs Golf) -- */
  const handleSection = (k: string | null) => {
    if (!k) return;
    const catId = k === "MainMenu" ? mainDefaultId : golfDefaultId;
    router.push(`/menu/${k}/${encodeURIComponent(catId)}`);
  };

  /* -- sub-tabs inside MAIN -- */
  const handleMain = (id: string | null) => {
    if (!id) return;
    persistLast("MainMenu", id);
    router.push(`/menu/MainMenu/${encodeURIComponent(id)}`);
  };

  /* -- sub-tabs inside GOLF -- */
  const handleGolf = (id: string | null) => {
    if (!id) return;
    persistLast("GolfMenu", id);
    router.push(`/menu/GolfMenu/${encodeURIComponent(id)}`);
  };

  /* ----------------------------------------------------------------
   *  Item-click routing helpers
   * ---------------------------------------------------------------- */
  /* MAIN flow: direct to ASAP if open, otherwise show schedule modal */
  const startMain = (id: string) => {
    setSelectedItemId(id);

    if (!isOpen) {
      // Closed → let user pick ASAP or scheduled time
      setShowModal(true);
    } else {
      // Open → default to ASAP
      setOrderStatus("asap");
      setScheduledTime(new Date().toISOString());
      toast.success("ASAP order set!");
      router.push(`/menuitem/${id}?schedule=asap&from=main`);
    }
  };

  /* GOLF flow: always direct (if kitchen open) */
  const startGolf = (id: string) => {
    if (!isOpen) {
      toast.info("Restaurant is currently closed.");
      return;
    }
    router.push(`/menuitem/${id}?from=golf`);
  };

  /* ---------- schedule modal callbacks ---------- */
  const handleASAP = () => {
    if (!selectedItemId) return;
    setOrderStatus("asap");
    setScheduledTime(new Date().toISOString());
    toast.success("ASAP order set!");
    setShowModal(false);
    router.push(`/menuitem/${selectedItemId}?schedule=asap&from=main`);
  };

  const handleSchedule = () => {
    if (!selectedItemId) return;
    setOrderStatus("scheduled");
    setScheduledTime(null);
    toast.success("Pick a time next!");
    setShowModal(false);
    router.push(
      `/schedule-order?itemId=${selectedItemId}` +
        `&returnUrl=/menuitem/${selectedItemId}?from=main`
    );
  };

  /* --------------------- render ------------------------------- */
  if (isLoading) return <p className="text-center">Loading…</p>;
  if (error)
    return <p className="text-center">Error: {(error as Error).message}</p>;

  return (
    <div className={`container py-5 ${styles.menuWrapper}`}>
      {activeSection === "MainMenu" && <MenuTimingBar />}
      <h1 className="text-center mb-4">Our Menu</h1>

      {/* Schedule modal only appears if store is closed */}
      {!isOpen && (
        <ScheduleOrderModal
          show={showModal}
          onHide={() => setShowModal(false)}
          isStoreOpen={isOpen}
          onASAP={handleASAP}
          onSchedule={handleSchedule}
        />
      )}

      <Tabs
        activeKey={activeSection}
        onSelect={handleSection}
        id="menu-tabs"
        mountOnEnter={false}
        unmountOnExit={false}
      >
        {/* ------------------ MAIN MENU ------------------ */}
        <Tab
          eventKey="MainMenu"
          title="Main Menu"
          onMouseEnter={prefetch}
          onFocus={prefetch}
        >
          <Tabs
            activeKey={activeCatId}
            onSelect={handleMain}
            id="main-subtabs"
            className="mt-4"
            mountOnEnter={false}
            unmountOnExit={false}
          >
            {mainCats.map((cat) => (
              <Tab key={cat.id} eventKey={cat.id} title={cat.name}>
                <div className={`row mt-4 ${styles.fadeInEnter}`}>
                  {mainItems
                    .filter((m) => m.category?.id === cat.id)
                    .map((m) => (
                      <div className="col-md-6 col-lg-4 mb-4" key={m.id}>
                        <MenuItem
                          item={m}
                          allowAddToCart
                          restaurantOpen={isOpen}
                          onStartOrder={startMain}
                          showGolfFlag={false}
                        />
                      </div>
                    ))}
                </div>
              </Tab>
            ))}
          </Tabs>
        </Tab>

        {/* ------------------ GOLF MENU ------------------ */}
        <Tab
          eventKey="GolfMenu"
          title={
            <>
              <span className={styles.golfFlag}>🚩</span>Golf Menu
            </>
          }
          onMouseEnter={prefetch}
          onFocus={prefetch}
        >
          <Tabs
            activeKey={activeCatId}
            onSelect={handleGolf}
            id="golf-subtabs"
            className="mt-4"
            mountOnEnter={false}
            unmountOnExit={false}
          >
            {golfCats.map((cat) => (
              <Tab key={cat.id} eventKey={cat.id} title={cat.name}>
                <div className={`row mt-4 ${styles.fadeInEnter}`}>
                  {golfItems
                    .filter((m) => m.category?.id === cat.id)
                    .map((m) => (
                      <div className="col-md-6 col-lg-4 mb-4" key={m.id}>
                        <MenuItem
                          item={m}
                          allowAddToCart
                          restaurantOpen={isOpen}
                          onStartOrder={startGolf}
                          showGolfFlag={true}
                        />
                      </div>
                    ))}
                </div>
              </Tab>
            ))}
          </Tabs>
        </Tab>
      </Tabs>
    </div>
  );
}
