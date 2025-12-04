# 0.Web - Auth Web Frontend & Gateway

이 프로젝트는 [10_modules](https://github.com/soony1995/10_modules.git) 저장소의 `0.Web` 모듈입니다. React 기반의 최소 UI와 Nginx 게이트웨이를 분리된 컨테이너로 제공합니다.

- **web-static**: React 애플리케이션의 정적 파일 빌드 및 제공 (`serve`).
- **web-gateway**: 백엔드 서비스(`auth-service`, `media-service` 등)로의 라우팅 및 인증 위임 (`auth_request`)을 담당하는 Nginx 리버스 프록시.

## 프로젝트 구조

- `frontend/`: Vite + React UI 소스 코드.
  - `/api/v1/auth/*` 엔드포인트 테스트 (가입, 로그인)
  - JWT 토큰 검증 패널
  - 미디어 업로드 및 목록 조회 UI
- `nginx/`: Nginx 설정 파일 (`app.conf`).
  - `auth_request`를 이용한 인증 처리
  - `/api/*` -> `auth-service` 프록시
  - `/media` -> `media-service` 프록시
- `docker-compose.yml`: 컨테이너 오케스트레이션 설정.

## 시작하기 (Docker)

이 모듈은 `10_modules` 외부 네트워크를 사용합니다. 실행 전 해당 네트워크가 존재해야 합니다.

```bash
# 1. 네트워크 생성 (최초 1회)
docker network create 10_modules

# 2. 컨테이너 빌드 및 실행
docker compose build
docker compose up -d
```

### 서비스 구성

| 서비스 명 | 컨테이너 명 | 호스트 포트 | 내부 포트 | 설명 |
|---|---|---|---|---|
| **web-static** | `auth-web-static` | 3000 | 4173 | React 정적 파일 서버 |
| **web-gateway** | `auth-web-gateway` | 8080 | 80 | 메인 엔트리포인트 (Nginx) |

실행 후 `http://localhost:8080`으로 접속하여 애플리케이션을 사용할 수 있습니다.

> **Note**: `web-gateway`는 `auth-service` 및 `media-service` 컨테이너와 `10_modules` 네트워크를 통해 통신합니다. 백엔드 서비스들이 실행되어 있어야 정상적으로 동작합니다.

## 로컬 개발 (Frontend)

Docker 없이 로컬에서 React 앱을 개발하려면 `frontend` 디렉토리에서 다음을 수행합니다.

```bash
cd frontend
npm install
npm run dev
```

### 환경 변수 설정 (.env.local)

로컬 개발 시 백엔드 API와의 통신을 위해 `.env.local` 파일을 생성하고 다음 변수를 설정할 수 있습니다.

```ini
# 인증 서버 게이트웨이 주소 (기본값: same-origin)
VITE_API_BASE_URL=http://localhost:8080

# 미디어 파일/API 서버 주소
VITE_MEDIA_API_BASE_URL=http://localhost:9000

# (선택) 로컬 개발 프록시 타겟 (npm run dev 사용 시)
VITE_MEDIA_PROXY_TARGET=http://localhost:4000
```

## Nginx 설정 (`nginx/app.conf`)

Nginx는 다음과 같은 라우팅 규칙을 가집니다. 설정 수정 후에는 `docker compose restart web-gateway`로 적용할 수 있습니다.

- **`/`**: `auth-web-static` 컨테이너로 프록시 (UI 제공).
- **`/internal/auth`**: 내부 인증용 (`auth-service:8080/auth/validate`).
- **`/api/v1/auth/*`**: 로그인, 회원가입 등 공개 API (`auth-service`로 전달).
- **`/api/*`**: 그 외 API는 `auth_request`로 토큰 검증 후 `auth-service`로 전달.
- **`/media`**: 미디어 서비스 API (`media-service:4000`으로 전달, 인증 필요).

## 미디어 처리 (Media)

- **UI**: "Media Uploads" 섹션에서 파일 업로드 및 미리보기 가능.
- **Backend**: Nginx가 `/media` 경로로 들어오는 요청을 `media-service:4000`으로 프록시합니다.