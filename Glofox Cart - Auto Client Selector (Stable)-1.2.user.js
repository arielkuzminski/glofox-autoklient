// ==UserScript==
// @name         Glofox Cart - Auto Client Selector (Stable)
// @namespace    glofox
// @version      1.2
// @description  Automatycznie wybiera klienta (np. Sigma Sklep Lębork) w koszyku Glofox.
// @match        https://app.glofox.com/*
// @run-at       document-idle
// @grant        none
// @author       Ariel Kuźmiński (ariel.kuzminski@gmail.com)
// @github       https://github.com/arielkuzminski/glofox-autoklient
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Konfiguracja:
   * - CLIENT_NAME: pełna nazwa klienta do wybrania.
   * - CLIENT_QUERY: tekst wpisywany do wyszukiwarki w modalu.
   * - *_SELECTOR: selektory UI, gdyby Glofox je zmienił.
   */
  const CLIENT_NAME = "Sigma Sklep Lębork";
  const CLIENT_QUERY = "sigma sklep lębork";

  const CART_HASH = "/cart";
  const SELECT_CLIENT_BUTTON_SELECTOR = [
    '[data-testid="button-test-id-1"]',
    '[data-testid="change-client-btn"]',
    '[data-testid="select-client-empty-avatar"]',
  ].join(", ");
  const MODAL_SELECTOR = '[data-testid="modal-content"]';
  const INPUT_SELECTOR =
    'input[placeholder*="Wyszukaj klienta"], input[placeholder*="Nazwa klienta"], input[placeholder*="Client"]';
  const RESULT_ITEM_SELECTOR =
    '.searchResult, [data-testid^="client-"], [data-testid*="client"], li[data-testid^="search_result_"], .ant-list-item';
  const RESULT_NAME_SELECTOR =
    '.itemName, .client-card--name, h3, .SearchResultsElement_searchResultTitle__2DLt6, .ant-list-item-meta-title span, [data-testid*="client-name"]';
  const SELECTED_CLIENT_NAME_SELECTOR =
    '.card-row--name, [data-testid*="selected-client"]';
  const SELECT_ITEM_BUTTON_SELECTOR = '[data-testid="select-item-button"]';

  let isSelecting = false;
  let lastTriggeredAt = 0;

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function isCartPage() {
    return (location.hash || "").includes(CART_HASH);
  }

  function normalizeText(str) {
    return (str || "").toString().trim().toLowerCase();
  }

  function getModal() {
    return document.querySelector(MODAL_SELECTOR);
  }

  function getSearchInput() {
    const modal = getModal();
    if (!modal) return null;
    return modal.querySelector(INPUT_SELECTOR);
  }

  function getSelectedClientName() {
    const el = document.querySelector(SELECTED_CLIENT_NAME_SELECTOR);
    return el ? el.innerText.trim() : "";
  }

  /**
   * Czeka aż przycisk wyboru produktu pojawi się w DOM i będzie ENABLED.
   * @param {number} timeoutMs
   * @returns {Promise<HTMLElement|null>}
   */
  function waitForProductButton(timeoutMs = 5000) {
    const getEnabledButton = () => {
      const btn = document.querySelector(SELECT_ITEM_BUTTON_SELECTOR);
      if (btn && !btn.disabled) return btn;
      return null;
    };

    const existing = getEnabledButton();
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const target = document.body;
      if (!target || !(target instanceof Node)) {
        resolve(null);
        return;
      }

      const observer = new MutationObserver(() => {
        const enabledBtn = getEnabledButton();
        if (enabledBtn) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(enabledBtn);
        }
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"],
      });
    });
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function openProductModal() {
    const btn = await waitForProductButton(5000);
    if (!btn) {
      return false;
    }
    btn.click();
    return true;
  }

  function isTargetClientSelected() {
    const current = normalizeText(getSelectedClientName());
    if (!current) return false;
    return current.includes(normalizeText(CLIENT_NAME));
  }

  function setInputValue(input, value) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function waitForClientButton(timeoutMs = 5000) {
    const existing = document.querySelector(SELECT_CLIENT_BUTTON_SELECTOR);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const target = document.body;
      if (!target || !(target instanceof Node)) {
        resolve(null);
        return;
      }

      const observer = new MutationObserver(() => {
        const btn = document.querySelector(SELECT_CLIENT_BUTTON_SELECTOR);
        if (btn) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(btn);
        }
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      observer.observe(target, { childList: true, subtree: true });
    });
  }

  async function openClientModal() {
    const btn = await waitForClientButton(6000);
    if (!btn) {
      return false;
    }
    btn.click();
    return true;
  }

  function waitForModalReady(timeoutMs = 5000) {
    const input = getSearchInput();
    if (input) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const target = document.body;
      if (!target || !(target instanceof Node)) {
        resolve(false);
        return;
      }

      const observer = new MutationObserver(() => {
        if (getSearchInput()) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(true);
        }
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeoutMs);

      observer.observe(target, { childList: true, subtree: true });
    });
  }

  function findClientResult() {
    const modal = getModal();
    if (!modal) return null;
    const items = [...modal.querySelectorAll(RESULT_ITEM_SELECTOR)];
    const target = normalizeText(CLIENT_NAME);
    return (
      items.find((el) => {
        const nameEl = el.querySelector(RESULT_NAME_SELECTOR) || el;
        const text = normalizeText(nameEl.innerText);
        return text.includes(target);
      }) || null
    );
  }

  function clickClientResult(match) {
    if (!match) return false;
    const clickable =
      match.querySelector(".itemInfo") ||
      match.querySelector(".SearchResultsElement_searchResultTitle__2DLt6") ||
      match.querySelector(".ant-list-item-meta-title") ||
      match;
    clickable.click();
    return true;
  }

  function waitForClientResult(timeoutMs = 7000) {
    if (findClientResult()) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const modal = getModal();
      const target = modal instanceof Node ? modal : document.body;
      if (!target || !(target instanceof Node)) {
        resolve(false);
        return;
      }

      const observer = new MutationObserver(() => {
        if (findClientResult()) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(true);
        }
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeoutMs);

      observer.observe(target, { childList: true, subtree: true });
    });
  }

  function isModalHidden(modal) {
    if (!modal) return true;
    const className = modal.className || "";
    if (className.includes("contentShown")) return false;
    if (className.includes("contentHidden")) return true;
    const style = window.getComputedStyle(modal);
    if (style.display === "none") return true;
    if (style.visibility === "hidden") return true;
    if (style.opacity === "0") return true;
    return false;
  }

  function tryCloseModal() {
    const modal = getModal();
    if (!modal) return;

    const escDown = new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
    });
    const escUp = new KeyboardEvent("keyup", {
      key: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
    });
    document.dispatchEvent(escDown);
    document.dispatchEvent(escUp);

    const closeBtn =
      modal.querySelector('[data-testid*="close"]') ||
      modal.querySelector(".ant-modal-close") ||
      modal.querySelector('button[aria-label*="close" i]') ||
      modal.querySelector('button[aria-label*="zamknij" i]');
    if (closeBtn) closeBtn.click();

    const overlay =
      document.querySelector('[data-testid*="overlay"]') ||
      document.querySelector(".ant-modal-mask") ||
      document.querySelector(".ant-modal-wrap");
    if (overlay) overlay.click();
  }

  function waitForModalClose(timeoutMs = 5000) {
    if (isModalHidden(getModal())) return Promise.resolve(true);

    return new Promise((resolve) => {
      const start = Date.now();
      let stableHidden = 0;
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - start;
        if (isModalHidden(getModal())) {
          stableHidden += 1;
          if (stableHidden >= 3) {
            clearInterval(intervalId);
            resolve(true);
          }
          return;
        }
        stableHidden = 0;
        if (elapsed >= timeoutMs) {
          clearInterval(intervalId);
          tryCloseModal();
          resolve(false);
        }
      }, 200);
    });
  }

  function waitForClientSelection(timeoutMs = 6000) {
    if (isTargetClientSelected() && isModalHidden(getModal())) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const start = Date.now();
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - start;
        if (isTargetClientSelected() && isModalHidden(getModal())) {
          clearInterval(intervalId);
          resolve(true);
          return;
        }
        if (elapsed >= timeoutMs) {
          clearInterval(intervalId);
          resolve(false);
        }
      }, 100);
    });
  }

  async function selectClientFlow() {
    if (!isCartPage()) return;
    if (isSelecting) return;
    if (isTargetClientSelected()) return;

    const now = Date.now();
    if (now - lastTriggeredAt < 1000) return;
    lastTriggeredAt = now;

    isSelecting = true;
    try {
      const opened = await openClientModal();
      if (!opened) return;

      const modalReady = await waitForModalReady(6000);
      if (!modalReady) return;

      const input = getSearchInput();
      if (!input) {
        return;
      }
      setInputValue(input, CLIENT_QUERY);
      const resultsReady = await waitForClientResult(8000);
      if (!resultsReady) return;

      const match = findClientResult();
      if (!match) {
        return;
      }

      const clicked = clickClientResult(match);
      if (!clicked) {
        return;
      }
      const selectionReady = await waitForClientSelection(7000);
      if (!selectionReady) return;

      const modalClosed = await waitForModalClose(5000);
      if (!modalClosed) return;

      await sleep(600);

      const productModalOpened = await openProductModal();
      if (!productModalOpened) {
        return;
      }




    } finally {
      isSelecting = false;
    }
  }

  const pageObserver = new MutationObserver(() => {
    if (isCartPage()) selectClientFlow();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("hashchange", () => {
    if (isCartPage()) selectClientFlow();
  });

  let lastUrl = location.href;
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (!isCartPage()) {
        lastTriggeredAt = 0;
        return;
      }
      selectClientFlow();
    }
  }, 500);

  if (isCartPage()) {
    sleep(0).then(selectClientFlow);
  }
})();
