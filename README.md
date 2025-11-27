# Auth Web Frontend

React 기반의 최소 UI와 Nginx 게이트웨이를 분리된 컨테이너로 제공한다. `web-static`은 정적 빌드만 담당하고, `web-gateway`는 여러 백엔드와의 라우팅/인증 위임을 담당한다.

## 구조

- `frontend/` – Vite + React UI. `/api/v1/auth/*` 엔드포인트에 대한 폼과 `/auth/validate` 테스트 패널을 제공한다.
- `nginx/` – `auth_request` 기반 프록시 설정 (`app.conf`). 수정 후 컨테이너 재시작만으로 반영된다.
- `Dockerfile` – React 정적 파일만 빌드하고 `serve`로 노출하는 컨테이너 정의(포트 `4173`).

## 환경 변수

- `AUTH_SERVER_ORIGIN` (기본값: `http://auth-service:8080`)
  - Nginx가 프록시할 실제 인증 서버의 베이스 URL.
  - Docker Compose 실행 시 `environment` 항목으로 손쉽게 교체할 수 있다.

## 로컬 개발

```bash
cd frontend
npm install
npm run dev
```

React 개발 서버에서 API 호출을 테스트하려면 `.env.local`에 `VITE_API_BASE_URL=http://localhost:8080` (gateway 주소) 처럼 설정한다.

## 컨테이너 빌드 & 실행

```bash
# 루트 (docker-compose.yml 이 위치한 상위 디렉터리)에서
# 최초 1회 공유 네트워크 생성 (이미 있으면 생략)
docker network create auth-shared

docker compose build web-static
docker compose up web-gateway web-static
```

구성 요소:

- **web-static** – `auth-web-static` 컨테이너. 4173 포트에서 React 정적 파일을 제공합니다.
- **web-gateway** – `auth-web-gateway` 컨테이너. `./0.Web/nginx/app.conf`를 그대로 로드하고, `/` 요청은 정적 서비스로, `/api/*` 요청은 인증 서버로 프록시합니다.

`web-gateway`는 `auth-shared` 네트워크를 통해 `1.Authentication`의 `auth-service` 컨테이너와 통신한다. 따라서 백엔드 스택을 실행하기 전에 해당 네트워크와 `auth-service`가 준비되어 있어야 한다. `nginx/app.conf`를 수정한 뒤 `docker compose restart web-gateway`만 실행하면 새 라우팅 규칙이 즉시 반영됩니다.

## 커밋 메시지 템플릿

루트에 있는 `.gitmessage` 파일을 사용하면 일관된 커밋 메시지를 작성할 수 있다.

1. 최초 1회 아래 명령으로 Git에 템플릿을 등록한다.
   ```bash
   git config commit.template .gitmessage
   ```
2. `git commit`을 실행하면 편집기에 템플릿이 자동으로 채워진다.
   - 첫 줄은 `type: Subject` 형식이다. `type`은 `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 중에서 선택한다.
   - `Subject`는 명령형으로 50자 이하로 작성한다.
   - 본문은 72자 이하로 줄바꿈하며 bullet 형태로 변경 사유를 적는다(생략 가능).
   - `Refs`에는 이슈/티켓 번호를 적거나 필요 없으면 삭제해도 된다.
   - `Testing`에는 실행한 명령이나 수동 검증을 적는다.
