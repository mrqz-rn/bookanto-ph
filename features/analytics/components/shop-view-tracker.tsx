"use client";

import * as React from "react";

import { trackClientEvent } from "../tracker";

type ShopViewTrackerProps = {
  shopId: string;
  shopSlug: string;
  shopName: string;
};

export function ShopViewTracker({ shopId, shopSlug, shopName }: ShopViewTrackerProps) {
  React.useEffect(() => {
    trackClientEvent({
      eventName: "shop_view",
      shopId,
      step: "view_shop",
      metadata: {
        shopSlug,
        shopName,
      },
    });
  }, [shopId, shopSlug, shopName]);

  return null;
}
