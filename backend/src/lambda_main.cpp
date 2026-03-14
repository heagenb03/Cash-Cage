#include <aws/lambda-runtime/runtime.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <algorithm>
#include "handlers/settlement_logic.hpp"

using namespace aws::lambda_runtime;

std::string base64_decode(const std::string& encoded) {
    return encoded;
}

cashcage::HttpRequest parseLambdaEvent(const std::string& payload) {
    cashcage::HttpRequest request;

    try {
        auto event = nlohmann::json::parse(payload);

        if (event.contains("requestContext") && event["requestContext"].contains("http")) {
            const auto& http = event["requestContext"]["http"];

            if (http.contains("method")) {
                request.method = http["method"].get<std::string>();
            }

            if (http.contains("path")) {
                request.path = http["path"].get<std::string>();
            }
        }

        if (event.contains("body")) {
            if (!event["body"].is_null()) {
                request.body = event["body"].get<std::string>();

                if (event.contains("isBase64Encoded") &&
                    event["isBase64Encoded"].get<bool>()) {
                    request.body = base64_decode(request.body);
                }
            }
        }

        if (event.contains("headers") && event["headers"].is_object()) {
            for (auto& [key, value] : event["headers"].items()) {
                if (value.is_string()) {
                    request.headers[key] = value.get<std::string>();
                }
            }
        }

        if (request.path.empty()) {
            request.path = "/";
        }

        if (request.method.empty()) {
            request.method = "GET";
        }

    } catch (const std::exception& e) {
        std::cerr << "[Lambda] Error parsing event: " << e.what() << std::endl;
        request.method = "GET";
        request.path = "/";
    }

    return request;
}

invocation_response createLambdaResponse(const cashcage::HttpResponse& response) {
    nlohmann::json lambdaResponse;

    lambdaResponse["statusCode"] = response.statusCode;

    nlohmann::json headers;
    for (const auto& [key, value] : response.headers) {
        headers[key] = value;
    }
    lambdaResponse["headers"] = headers;

    lambdaResponse["body"] = response.body;

    lambdaResponse["isBase64Encoded"] = false;

    return invocation_response::success(
        lambdaResponse.dump(),
        "application/json"
    );
}

invocation_response handler(invocation_request const& request) {
    try {
        std::cout << "[Lambda] Received event" << std::endl;

        cashcage::HttpRequest httpRequest = parseLambdaEvent(request.payload);

        std::cout << "[Lambda] Method: " << httpRequest.method
                  << ", Path: " << httpRequest.path << std::endl;

        cashcage::HttpResponse httpResponse = cashcage::handleRequest(httpRequest);

        std::cout << "[Lambda] Response status: " << httpResponse.statusCode << std::endl;

        return createLambdaResponse(httpResponse);

    } catch (const std::exception& e) {
        std::cerr << "[Lambda] Unhandled error: " << e.what() << std::endl;

        nlohmann::json errorResponse = {
            {"statusCode", 500},
            {"headers", {
                {"Content-Type", "application/json"},
                {"Access-Control-Allow-Origin", "*"}
            }},
            {"body", nlohmann::json({
                {"error", "Internal server error"},
                {"message", e.what()}
            }).dump()},
            {"isBase64Encoded", false}
        };

        return invocation_response::success(
            errorResponse.dump(),
            "application/json"
        );
    }
}

int main() {
    std::cout << "[Lambda] Cash Cage Settlement Service starting..." << std::endl;
    std::cout << "[Lambda] Waiting for invocations..." << std::endl;

    run_handler(handler);

    return 0;
}
