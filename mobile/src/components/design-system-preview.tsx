/**
 * Living reference for the FarmPool design system.
 *
 * Every token defined in `src/styles/` is used at least once below, which is
 * what makes this file useful twice over: it is the page to look at when you
 * want to see the system, and — because Tailwind only emits utilities it finds
 * in source — it is also what proves the tokens actually compile. A token that
 * stops working shows up here before it shows up in a screen.
 *
 * Not routed. Drop <DesignSystemPreview /> into a screen when you want it, or
 * read it as documentation. It is not shipped to users.
 */

import { ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <VStack className="gap-3">
      <Text className="type-body-sm-bold uppercase text-muted-foreground">{title}</Text>
      {children}
    </VStack>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <VStack className="gap-1">
      <Box className={`h-12 w-12 rounded-field border border-border ${className}`} />
      <Text className="type-body-sm text-muted-foreground">{label}</Text>
    </VStack>
  );
}

export function DesignSystemPreview() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-gutter gap-8 pb-16">
      {/* ── Type scale — Figma node 121:28499 ─────────────────────────── */}
      <Section title="Type scale">
        <VStack className="gap-2">
          <Text className="type-display text-foreground">Display · Poppins 40/44</Text>
          <Text className="type-h1 text-foreground">H1 · Poppins 30/36</Text>
          <Text className="type-h2 text-foreground">H2 · Poppins 26/32</Text>
          <Text className="type-h3 text-foreground">H3 · Poppins 22/28</Text>
          <Text className="type-h4 text-foreground">H4 · Poppins 18/24</Text>
          <Text className="type-title text-foreground">Title · Poppins 20/25 (app bar)</Text>
          <Text className="type-body-lg text-foreground">Body Large · Mulish 17/26</Text>
          <Text className="type-body text-foreground">Body · Mulish 15/22</Text>
          <Text className="type-caption text-muted-foreground">Caption · Mulish 14/20</Text>
          <Text className="type-body-sm text-muted-foreground">Body Small · Mulish 13/18</Text>
          <Text className="type-body-bold text-foreground">Body Bold · Mulish Bold 15/22</Text>
        </VStack>
      </Section>

      {/* ── Brand ramps — Figma node 121:28500 ────────────────────────── */}
      <Section title="Brand ramps">
        <VStack className="gap-4">
          <HStack className="gap-3">
            <Swatch className="bg-leaf-100" label="leaf-100" />
            <Swatch className="bg-leaf-200" label="leaf-200" />
            <Swatch className="bg-leaf-500" label="leaf-500" />
            <Swatch className="bg-leaf-700" label="leaf-700" />
            <Swatch className="bg-leaf-900" label="leaf-900" />
          </HStack>
          <HStack className="gap-3">
            <Swatch className="bg-lilac-50" label="lilac-50" />
            <Swatch className="bg-lilac-900" label="lilac-900" />
          </HStack>
          <HStack className="gap-3">
            <Swatch className="bg-harvest-50" label="harvest-50" />
            <Swatch className="bg-harvest-200" label="harvest-200" />
            <Swatch className="bg-harvest-500" label="harvest-500" />
          </HStack>
          <HStack className="gap-3">
            <Swatch className="bg-river-50" label="river-50" />
            <Swatch className="bg-river-200" label="river-200" />
            <Swatch className="bg-river-500" label="river-500" />
          </HStack>
          <HStack className="gap-3">
            <Swatch className="bg-paper" label="paper" />
            <Swatch className="bg-mist" label="mist" />
            <Swatch className="bg-stone" label="stone" />
            <Swatch className="bg-ink" label="ink" />
          </HStack>
        </VStack>
      </Section>

      {/* ── Semantic tokens — these are what app code should use ──────── */}
      <Section title="Semantic (theme-aware)">
        <HStack className="flex-wrap gap-3">
          <Swatch className="bg-primary" label="primary" />
          <Swatch className="bg-secondary" label="secondary" />
          <Swatch className="bg-card" label="card" />
          <Swatch className="bg-muted" label="muted" />
          <Swatch className="bg-brand-deep" label="brand-deep" />
          <Swatch className="bg-brand-deep-muted" label="deep-muted" />
          <Swatch className="bg-persona-buyer" label="persona-buyer" />
          <Swatch className="bg-success" label="success" />
          <Swatch className="bg-warning" label="warning" />
          <Swatch className="bg-info" label="info" />
          <Swatch className="bg-destructive" label="destructive" />
        </HStack>
      </Section>

      {/* ── Radius and elevation ──────────────────────────────────────── */}
      <Section title="Radius & elevation">
        <HStack className="items-center gap-3">
          <Box className="elevation-card h-16 w-16 rounded-chip bg-card" />
          <Box className="elevation-card h-16 w-16 rounded-field bg-card" />
          <Box className="elevation-card h-16 w-16 rounded-card bg-card" />
          <Box className="elevation-card h-16 w-16 rounded-tile bg-card" />
          <Box className="elevation-card h-16 w-16 rounded-pill bg-card" />
        </HStack>
        <Text className="type-body-sm text-muted-foreground">
          chip 12 · field 14 · card 16 · tile 20 · pill full — plus rounded-sheet 28 for a sheet
          rising over a panel
        </Text>
      </Section>

      {/* ── Composed patterns ─────────────────────────────────────────── */}
      <Section title="Patterns">
        <VStack className="gap-3">
          {/* Selectable role row — Figma node 184:19. The whole row is one tap
              target, which is why min-h-tap is on the row and not the icon. */}
          <HStack className="elevation-card min-h-tap items-center gap-3 rounded-card border border-primary bg-card p-3">
            <Box className="h-10 w-10 items-center justify-center rounded-card bg-secondary" />
            <VStack className="flex-1">
              <Text className="type-body-bold text-foreground">Farmer</Text>
              <Text className="type-body-sm text-muted-foreground">
                I grow produce and want to sell it
              </Text>
            </VStack>
            <Box className="h-5 w-5 rounded-pill bg-primary" />
          </HStack>

          {/* Primary and secondary action. In real screens use <AppButton>
              rather than rebuilding these — see src/components/app/app-button.tsx. */}
          <Box className="h-control items-center justify-center rounded-field bg-primary px-4">
            <Text className="type-h4 text-primary-foreground">Continue</Text>
          </Box>

          <Box className="h-control items-center justify-center rounded-field border border-brand-deep bg-card px-4">
            <Text className="type-h4 text-brand-deep">Log in</Text>
          </Box>

          {/* Status badges — the order lifecycle */}
          <HStack className="gap-2">
            <Box className="rounded-pill bg-warning-subtle px-3 py-1">
              <Text className="type-body-sm-bold text-warning">Pending</Text>
            </Box>
            <Box className="rounded-pill bg-info-subtle px-3 py-1">
              <Text className="type-body-sm-bold text-info">In transit</Text>
            </Box>
            <Box className="rounded-pill bg-success-subtle px-3 py-1">
              <Text className="type-body-sm-bold text-success">Delivered</Text>
            </Box>
          </HStack>

          {/* Tab bar — Figma node 196:6638. Active tab is a mint pill with a
              deep-forest label; inactive is muted. */}
          <HStack className="items-center justify-around rounded-card border-t border-border bg-card py-2">
            <Box className="min-h-tap min-w-tap items-center justify-center px-3">
              <Text className="type-body-sm text-muted-foreground">Jobs</Text>
            </Box>
            <Box className="min-h-tap min-w-tap items-center justify-center rounded-card bg-secondary px-3">
              <Text className="type-body-sm-bold text-secondary-foreground">Alerts</Text>
            </Box>
            <Box className="min-h-tap min-w-tap items-center justify-center px-3">
              <Text className="type-body-sm text-muted-foreground">Profile</Text>
            </Box>
          </HStack>
        </VStack>
      </Section>
    </ScrollView>
  );
}

export default DesignSystemPreview;
