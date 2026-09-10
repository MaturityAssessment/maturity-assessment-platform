import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_STEP_COUNT,
  DASHBOARD_TOUR_STEPS,
  DASHBOARD_TOUR_VERSION,
  getDashboardTourProgress,
  shouldOfferDashboardTour,
  type DashboardTourInvitationInput,
} from "../../../../src/app/dashboard/dashboardTour.ts";
import {
  computeTourPosition,
  TOUR_TARGET_GAP,
  TOUR_VIEWPORT_PADDING,
  type TourPlacement,
} from "../../../../src/components/guided-tour/guidedTourGeometry.ts";

test("defines a stable, deterministic four-step dashboard tour", () => {
  assert.equal(DASHBOARD_TOUR_KEY, "dashboard");
  assert.equal(DASHBOARD_TOUR_VERSION, 1);
  assert.equal(DASHBOARD_TOUR_STEP_COUNT, 4);
  assert.deepEqual(
    DASHBOARD_TOUR_STEPS.map((step) => step.id),
    ["side-navigation", "start-assessment", "all-assessments", "assistant"]
  );
  assert.deepEqual(
    DASHBOARD_TOUR_STEPS.map((step) => step.placement),
    ["right", "bottom", "top", "left"]
  );
  assert.equal(new Set(DASHBOARD_TOUR_STEPS.map((step) => step.target)).size, 4);
  for (const step of DASHBOARD_TOUR_STEPS) {
    assert.ok(step.title.trim().length > 0);
    assert.ok(step.description.trim().length > 0);
  }
});

test("reports first and last progress while clamping invalid boundaries", () => {
  assert.deepEqual(getDashboardTourProgress(0), {
    current: 1,
    total: 4,
    isFirst: true,
    isLast: false,
  });
  assert.deepEqual(getDashboardTourProgress(3), {
    current: 4,
    total: 4,
    isFirst: false,
    isLast: true,
  });
  assert.equal(getDashboardTourProgress(-1).current, 1);
  assert.equal(getDashboardTourProgress(99).current, 4);
  assert.equal(getDashboardTourProgress(Number.NaN).current, 1);
});

test("offers an invitation only after every dashboard gate is clear", () => {
  const eligible: DashboardTourInvitationInput = {
    enabled: true,
    completed: false,
    dismissed: false,
    loading: false,
    error: null,
    submissionNoticeOpen: false,
    alreadyOffered: false,
  };

  assert.equal(shouldOfferDashboardTour(eligible), true);

  const blockedStates: DashboardTourInvitationInput[] = [
    { ...eligible, enabled: false },
    { ...eligible, completed: true },
    { ...eligible, dismissed: true },
    { ...eligible, loading: true },
    { ...eligible, error: "Dashboard unavailable" },
    { ...eligible, submissionNoticeOpen: true },
    { ...eligible, alreadyOffered: true },
  ];
  for (const state of blockedStates) {
    assert.equal(shouldOfferDashboardTour(state), false);
  }
});

test("uses each preferred placement when its main axis has room", () => {
  const targetRect = { top: 300, left: 400, width: 100, height: 80 };
  const cardSize = { width: 200, height: 100 };
  const viewportSize = { width: 1000, height: 800 };
  const expected: Record<TourPlacement, ReturnType<typeof computeTourPosition>> = {
    top: { top: 188, left: 350, placement: "top" },
    right: { top: 290, left: 512, placement: "right" },
    bottom: { top: 392, left: 350, placement: "bottom" },
    left: { top: 290, left: 188, placement: "left" },
  };

  for (const placement of Object.keys(expected) as TourPlacement[]) {
    assert.deepEqual(
      computeTourPosition(targetRect, cardSize, viewportSize, placement),
      expected[placement]
    );
  }
  assert.equal(TOUR_TARGET_GAP, 12);
});

test("falls back to the opposite side when the preferred side does not fit", () => {
  assert.deepEqual(
    computeTourPosition(
      { top: 20, left: 400, width: 100, height: 80 },
      { width: 200, height: 100 },
      { width: 1000, height: 800 },
      "top"
    ),
    { top: 112, left: 350, placement: "bottom" }
  );
  assert.deepEqual(
    computeTourPosition(
      { top: 300, left: 900, width: 80, height: 80 },
      { width: 200, height: 100 },
      { width: 1000, height: 800 },
      "right"
    ),
    { top: 290, left: 688, placement: "left" }
  );
});

test("clamps cross-axis coordinates inside the viewport padding", () => {
  assert.deepEqual(
    computeTourPosition(
      { top: 250, left: 0, width: 20, height: 50 },
      { width: 200, height: 100 },
      { width: 500, height: 500 },
      "bottom"
    ),
    { top: 312, left: 16, placement: "bottom" }
  );
  assert.deepEqual(
    computeTourPosition(
      { top: 430, left: 100, width: 20, height: 20 },
      { width: 100, height: 100 },
      { width: 500, height: 500 },
      "right"
    ),
    { top: 384, left: 132, placement: "right" }
  );
  assert.equal(TOUR_VIEWPORT_PADDING, 16);
});
