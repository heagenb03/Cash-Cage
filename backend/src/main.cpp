#include <crow.h>
#include <iostream>
#include <cstdlib>
#include "handlers/settlement_handler.hpp"

int main() {
    crow::SimpleApp app;

    dealr::setupRoutes(app);

    const char* port_env = std::getenv("PORT");
    int port = port_env ? std::atoi(port_env) : 8080;

    std::cout << "Starting Dealr Settlement Service on port " << port << std::endl;
    std::cout << "Available endpoints:" << std::endl;
    std::cout << "  POST /settlements/optimal - Calculate optimal settlements" << std::endl;
    std::cout << "  GET  /health - Health check" << std::endl;

    app.port(port)
        .multithreaded()
        .run();

    return 0;
}
