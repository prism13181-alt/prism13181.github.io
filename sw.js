/* 누출사고 초동조치 가이드 - 오프라인 캐싱 서비스워커
 * 내용(HTML/이미지)이 바뀌면 CACHE_VERSION 숫자를 올려주세요.
 * 그래야 현장 기기들이 새 버전을 받아갑니다.
 */
// 이미지를 새로 올릴 때마다 이 숫자를 올려주세요. (예: 3, 4 …)
const CACHE_VERSION = 4;
const CACHE_NAME = "leak-guide-v" + CACHE_VERSION;

// 핵심 자산: 하나라도 없으면 설치 실패 (반드시 존재해야 하는 파일)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.png",
  "./route1.png",
  "./chestpoint1.png"
];

// 선택 자산: 아직 안 올렸을 수 있는 단계별 이미지.
// (1단계는 이미지 없음 → 목록에서 제외)
// 있으면 캐싱하고, 없으면 조용히 건너뜀 (설치 실패 안 함).
const OPTIONAL_ASSETS = [
  "./leak-step2.png",
  "./leak-step3.png",
  "./leak-step4-1.png",
  "./leak-step4-2.png",
  "./ph-step2.png",
  "./ph-step3.png",
  "./toolbox.png"
];

// 설치: 핵심 자산은 반드시 캐싱, 선택 자산은 개별적으로 시도
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const core = cache.addAll(CORE_ASSETS);
      const optional = Promise.all(
        OPTIONAL_ASSETS.map(url =>
          cache.add(url).catch(() => {
            /* 파일이 아직 없으면 무시 */
          })
        )
      );
      return Promise.all([core, optional]);
    }).then(() => self.skipWaiting())
  );
});

// 활성화: 이전 버전 캐시 정리
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 요청 처리: 네트워크 우선, 실패 시 캐시 (항상 최신 절차를 보되 오프라인에서도 동작)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공한 응답은 캐시 갱신
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
