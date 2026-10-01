# Built from the repo root (see docker-compose.yml), because it needs model/ too.

# --- Stage 1: build the jar. `mvn package` also runs TestCasesTest against
# model/test_cases.json, so an image is only produced if Java matches Python.
FROM maven:3.9-eclipse-temurin-21 AS build
# The tests load XGBoost4J, whose native library needs OpenMP (libgomp) on Linux
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY ml-service/pom.xml ml-service/
RUN cd ml-service && mvn -q -B dependency:go-offline
COPY model model
COPY ml-service/src ml-service/src
RUN cd ml-service && mvn -q -B package

# --- Stage 2: only the Java runtime, the jar and the model files
FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/ml-service/target/ml-service-0.1.0.jar app.jar
COPY model model
ENV MODEL_DIR=/app/model
RUN useradd --system app
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
