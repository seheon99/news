# joobjoob API

joobjoob의 백엔드 애플리케이션. 모노레포에서 `apps/web`과 별도로 운영한다.

## 기술 스택

| 항목 | 선택 | 비고 |
| --- | --- | --- |
| 언어 | Java 25 | Gradle toolchain으로 고정 |
| 프레임워크 | Spring Boot 4.2.0 | Spring MVC, Actuator |
| 모듈 구조 | Spring Modulith 2.2.0 | 모듈러 모놀리스, 이벤트 발행 레지스트리(JPA) |
| 데이터베이스 | PostgreSQL 18 | |
| 영속성 | Spring Data JPA (Hibernate) | `ddl-auto: validate` — 스키마는 Flyway가 소유 |
| 마이그레이션 | Flyway | `src/main/resources/db/migration`, `0001_<설명>.sql` 형식 |
| 빌드 도구 | Gradle 9.9 (Kotlin DSL, wrapper 포함) | |
| 테스트 | JUnit 5, Testcontainers | 테스트마다 실제 PostgreSQL 컨테이너 사용 |

## 프로젝트 구조

```
src/main/java/kr/seheon/joobjoob/
├── ApiApplication.java      # 루트 패키지 = 애플리케이션
└── <module>/                # 루트 바로 아래 패키지 하나 = 애플리케이션 모듈 하나
    ├── *.java               # 모듈 공개 API (다른 모듈이 참조 가능)
    └── internal/            # 모듈 내부 구현 (다른 모듈에서 참조 금지)
```

- 모듈은 기능(도메인) 단위로 만든다. 예: `feed`, `reader`.
- 모듈 간 통신은 공개 API 호출 또는 `ApplicationEventPublisher` 이벤트로 한다.
  `@ApplicationModuleListener`로 받은 이벤트는 `event_publication` 테이블에 기록되어 실패 시 재시도된다.
- 모듈 경계 위반은 `ModularityTests`가 잡는다 (`ApplicationModules.verify()`).

## 설정과 비밀정보

- `application.yaml`에는 비밀정보를 두지 않는다. DB 접속 정보는 환경변수로만 주입한다.

  | 환경변수 | 예시 |
  | --- | --- |
  | `DATABASE_URL` | `jdbc:postgresql://db:5432/joobjoob` |
  | `DATABASE_USERNAME` | `joobjoob` |
  | `DATABASE_PASSWORD` | (secret) |

  그 밖의 설정도 Spring Boot 규칙대로 환경변수로 덮어쓸 수 있다 (예: `SERVER_PORT=8081`).
- **로컬·테스트**: Testcontainers가 PostgreSQL을 띄우고 `@ServiceConnection`으로 연결한다. 환경변수 설정이 필요 없다.
- **배포**: 위 환경변수가 반드시 필요하다. 없으면 시작 시 실패한다.

## 로컬 실행

필요: JDK 25, Docker (Compose v2).

```bash
./gradlew bootTestRun # Testcontainers로 PostgreSQL을 띄우고 마이그레이션 후 :8080에서 실행
./gradlew bootRun     # DATABASE_* 환경변수로 지정한 DB에 연결
./gradlew test        # 전체 테스트 (Docker 필요)
./gradlew bootJar     # build/libs/api-0.0.1-SNAPSHOT.jar
```

헬스 체크:

```bash
curl localhost:8080/actuator/health            # {"status":"UP", ...}
curl localhost:8080/actuator/health/liveness
curl localhost:8080/actuator/health/readiness
```

## DB 마이그레이션

`src/main/resources/db/migration/<4자리 번호>_<설명>.sql` 형식으로 추가한다 (예: `0002_create_feed.sql`).
Flyway 기본 규칙(`V1__...`) 대신 `spring.flyway.sql-migration-prefix: ""`, `sql-migration-separator: "_"`로 설정했다. 애플리케이션 시작 시 Flyway가 적용하고,
Hibernate가 엔티티와 스키마가 일치하는지 검증한다. 이미 적용된 마이그레이션 파일은 수정하지 않는다.

## 배포

`.github/workflows/releaser.yml`의 `release-api` job이 담당한다.

- PR: `./gradlew build`(테스트 포함) 후 Docker 이미지를 빌드만 한다 (dry-run).
- `main` push / `v*.*.*` 태그: 테스트 후 `ghcr.io/seheon99/joobjoob-api` 이미지를 push·서명하고,
  SSH로 서버의 `JOOBJOOB_API_IMAGE_DIGEST`를 갱신해 `joobjoob-api` compose 서비스를 재시작한다.

```bash
docker build -t joobjoob-api apps/api
```
