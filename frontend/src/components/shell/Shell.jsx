import React from "react";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";

export default function Shell({ title, right, leading, children, hideNav = false, hideTopBar = false, contentClassName = "" }) {
  return (
    <>
      {!hideTopBar && <TopBar title={title} right={right} leading={leading} />}
      <main className={`tl-scroll ${contentClassName}`} data-testid="app-main">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </>
  );
}
