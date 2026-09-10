export type TourPlacement = "top" | "right" | "bottom" | "left";

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourSize {
  width: number;
  height: number;
}

export interface TourPosition {
  top: number;
  left: number;
  placement: TourPlacement;
}

export const TOUR_TARGET_GAP = 12;
export const TOUR_VIEWPORT_PADDING = 16;

const PLACEMENT_FALLBACKS: Record<
  TourPlacement,
  readonly TourPlacement[]
> = {
  top: ["top", "bottom", "right", "left"],
  right: ["right", "left", "bottom", "top"],
  bottom: ["bottom", "top", "right", "left"],
  left: ["left", "right", "bottom", "top"],
};

function getUnclampedPosition(
  targetRect: TourRect,
  cardSize: TourSize,
  placement: TourPlacement
) {
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  switch (placement) {
    case "top":
      return {
        top: targetRect.top - cardSize.height - TOUR_TARGET_GAP,
        left: targetCenterX - cardSize.width / 2,
      };
    case "right":
      return {
        top: targetCenterY - cardSize.height / 2,
        left: targetRect.left + targetRect.width + TOUR_TARGET_GAP,
      };
    case "bottom":
      return {
        top: targetRect.top + targetRect.height + TOUR_TARGET_GAP,
        left: targetCenterX - cardSize.width / 2,
      };
    case "left":
      return {
        top: targetCenterY - cardSize.height / 2,
        left: targetRect.left - cardSize.width - TOUR_TARGET_GAP,
      };
  }
}

function hasMainAxisSpace(
  targetRect: TourRect,
  cardSize: TourSize,
  viewportSize: TourSize,
  placement: TourPlacement
) {
  const position = getUnclampedPosition(targetRect, cardSize, placement);

  if (placement === "top") {
    return position.top >= TOUR_VIEWPORT_PADDING;
  }
  if (placement === "right") {
    return (
      position.left + cardSize.width <=
      viewportSize.width - TOUR_VIEWPORT_PADDING
    );
  }
  if (placement === "bottom") {
    return (
      position.top + cardSize.height <=
      viewportSize.height - TOUR_VIEWPORT_PADDING
    );
  }
  return position.left >= TOUR_VIEWPORT_PADDING;
}

function getAvailableMainAxisSpace(
  targetRect: TourRect,
  viewportSize: TourSize,
  placement: TourPlacement
) {
  switch (placement) {
    case "top":
      return targetRect.top - TOUR_TARGET_GAP - TOUR_VIEWPORT_PADDING;
    case "right":
      return (
        viewportSize.width -
        (targetRect.left + targetRect.width) -
        TOUR_TARGET_GAP -
        TOUR_VIEWPORT_PADDING
      );
    case "bottom":
      return (
        viewportSize.height -
        (targetRect.top + targetRect.height) -
        TOUR_TARGET_GAP -
        TOUR_VIEWPORT_PADDING
      );
    case "left":
      return targetRect.left - TOUR_TARGET_GAP - TOUR_VIEWPORT_PADDING;
  }
}

function clampToViewport(
  value: number,
  contentLength: number,
  viewportLength: number
) {
  const maximum = Math.max(
    TOUR_VIEWPORT_PADDING,
    viewportLength - contentLength - TOUR_VIEWPORT_PADDING
  );
  return Math.min(Math.max(value, TOUR_VIEWPORT_PADDING), maximum);
}

export function computeTourPosition(
  targetRect: TourRect,
  cardSize: TourSize,
  viewportSize: TourSize,
  preferredPlacement: TourPlacement
): TourPosition {
  const candidates = PLACEMENT_FALLBACKS[preferredPlacement];
  const fittingPlacement = candidates.find((placement) =>
    hasMainAxisSpace(targetRect, cardSize, viewportSize, placement)
  );
  const placement =
    fittingPlacement ??
    candidates.reduce((best, candidate) =>
      getAvailableMainAxisSpace(targetRect, viewportSize, candidate) >
      getAvailableMainAxisSpace(targetRect, viewportSize, best)
        ? candidate
        : best
    );
  const position = getUnclampedPosition(targetRect, cardSize, placement);

  return {
    top: clampToViewport(
      position.top,
      cardSize.height,
      viewportSize.height
    ),
    left: clampToViewport(
      position.left,
      cardSize.width,
      viewportSize.width
    ),
    placement,
  };
}
