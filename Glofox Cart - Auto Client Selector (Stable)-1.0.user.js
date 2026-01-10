// ==UserScript==
// @name         Glofox Cart - Auto Client Selector (Stable)
// @namespace    glofox
// @version      1.0
// @description  Automatycznie wybiera klienta (np. Sigma Sklep Lębork) w koszyku Glofox.
// @match        https://app.glofox.com/*
// @run-at       document-idle
// @grant        none
// @author       Ariel Kuźmiński (ariel.kuzminski@gmail.com)
// @github       https://github.com/arielkuzminski/glofox-autoklient
// ==/UserScript==

(function () {
  'use strict';

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
    '[data-testid="select-client-empty-avatar"]'
  ].join(', ');
  const MODAL_SELECTOR = '[data-testid="modal-content"]';
  const INPUT_SELECTOR = 'input[placeholder*="Wyszukaj klienta"], input[placeholder*="Nazwa klienta"], input[placeholder*="Client"]';
  const RESULT_ITEM_SELECTOR = '.searchResult, [data-testid^="client-"], [data-testid*="client"], li[data-testid^="search_result_"], .ant-list-item';
  const RESULT_NAME_SELECTOR = '.itemName, .client-card--name, h3, .SearchResultsElement_searchResultTitle__2DLt6, .ant-list-item-meta-title span, [data-testid*="client-name"]';
  const SELECTED_CLIENT_NAME_SELECTOR = '.card-row--name, [data-testid*="selected-client"]';

  let isSelecting = false;
  let lastTriggeredAt = 0;

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

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

  function isTargetClientSelected() {
    const current = normalizeText(getSelectedClientName());
    if (!current) return false;
    return current.includes(normalizeText(CLIENT_NAME));
  }

  function setInputValue(input, value) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
      console.warn("[GLOFOX] Nie znalazłem przycisku 'Wybierz klienta'.");
      return false;
    }
    console.log("[GLOFOX][trace] Klikam przycisk wyboru klienta.", btn);
    btn.click();
    return true;
  }

  function waitForModalReady(timeoutMs = 5000) {
    const input = getSearchInput();
    if (input) {
      console.log("[GLOFOX][trace] Input modala juz istnieje.");
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const target = document.body;
      console.log("[GLOFOX][trace] waitForModalReady observe target:", target, target && target.nodeType);
      if (!target || !(target instanceof Node)) {
        resolve(false);
        return;
      }

      const observer = new MutationObserver(() => {
        if (getSearchInput()) {
          console.log("[GLOFOX][trace] Input modala pojawil sie.");
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(true);
        }
      });

      const timeoutId = setTimeout(() => {
        console.warn("[GLOFOX][trace] waitForModalReady timeout.");
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
    console.log("[GLOFOX][trace] Wyniki klientow:", items.length);
    return items.find((el) => {
      const nameEl = el.querySelector(RESULT_NAME_SELECTOR) || el;
      const text = normalizeText(nameEl.innerText);
      return text.includes(target);
    }) || null;
  }

  function clickClientResult(match) {
    if (!match) return false;
    const clickable = match.querySelector('.itemInfo')
      || match.querySelector('.SearchResultsElement_searchResultTitle__2DLt6')
      || match.querySelector('.ant-list-item-meta-title')
      || match;
    console.log("[GLOFOX][trace] Klikam wynik klienta:", clickable);
    clickable.click();
    return true;
  }

  function waitForClientResult(timeoutMs = 7000) {
    if (findClientResult()) {
      console.log("[GLOFOX][trace] Wynik klienta juz obecny.");
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const modal = getModal();
      const target = modal instanceof Node ? modal : document.body;
      console.log("[GLOFOX][trace] waitForClientResult target:", target, target && target.nodeType);
      if (!target || !(target instanceof Node)) {
        resolve(false);
        return;
      }

      const observer = new MutationObserver(() => {
        if (findClientResult()) {
          console.log("[GLOFOX][trace] Wynik klienta pojawil sie.");
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(true);
        }
      });

      const timeoutId = setTimeout(() => {
        console.warn("[GLOFOX][trace] waitForClientResult timeout.");
        observer.disconnect();
        resolve(false);
      }, timeoutMs);

      observer.observe(target, { childList: true, subtree: true });
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
      console.log("[GLOFOX][trace] Start flow, czekam 2s na stabilizacje UI.");
      await sleep(2000);

      const opened = await openClientModal();
      if (!opened) return;

      const modalReady = await waitForModalReady(6000);
      if (!modalReady) {
        console.warn("[GLOFOX] Modal klienta nie otworzył się w czasie.");
        return;
      }

      const input = getSearchInput();
      if (!input) {
        console.warn("[GLOFOX] Modal otwarty, ale brak inputa wyszukiwarki.");
        return;
      }

      setInputValue(input, CLIENT_QUERY);

      const resultsReady = await waitForClientResult(8000);
      if (!resultsReady) {
        console.warn("[GLOFOX] Lista klientów nie pojawiła się w czasie.");
        return;
      }

      const match = findClientResult();
      if (!match) {
        console.warn("[GLOFOX] Nie znalazłem klienta:", CLIENT_NAME);
        return;
      }

      const clicked = clickClientResult(match);
      if (!clicked) {
        console.warn("[GLOFOX] Nie udalo sie kliknac wyniku klienta.");
      }
    } finally {
      isSelecting = false;
    }
  }

  const pageObserver = new MutationObserver(() => {
    if (isCartPage()) selectClientFlow();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
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
