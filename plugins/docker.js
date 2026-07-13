module.exports = {
  name: "docker",
  version: "1.0.0",
  description: "Docker project detection and tooling",
  detect: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"],
  tools: ["docker"],
  rules: [
    "Validate Dockerfile syntax with `docker build`",
    "Check for .dockerignore to reduce build context",
    "Use multi-stage builds for smaller images",
    "Avoid running as root in container",
  ],
};
