cmake_minimum_required(VERSION 3.16)
project(dealr-backend VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.0
)

FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)

find_package(aws-lambda-runtime QUIET)

if(NOT aws-lambda-runtime_FOUND)
    FetchContent_Declare(
        aws-lambda-runtime
        GIT_REPOSITORY https://github.com/awslabs/aws-lambda-cpp.git
        GIT_TAG v0.2.8
    )
    FetchContent_MakeAvailable(Crow json aws-lambda-runtime)
else()
    FetchContent_MakeAvailable(Crow json)
endif()

find_package(ortools CONFIG REQUIRED)

set(COMMON_SOURCES
    src/solvers/milp_solver.cpp
)

# Backend
set(CROW_SOURCES
    ${COMMON_SOURCES}
    src/main.cpp
)

add_executable(dealr-backend ${CROW_SOURCES})

target_include_directories(dealr-backend PRIVATE
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(dealr-backend PRIVATE
    Crow::Crow
    nlohmann_json::nlohmann_json
    ortools::ortools
)

if(MSVC)
    target_compile_options(dealr-backend PRIVATE /W4)
else()
    target_compile_options(dealr-backend PRIVATE -Wall -Wextra -pedantic)
endif()

install(TARGETS dealr-backend DESTINATION bin)

# AWS Lambda
set(LAMBDA_SOURCES
    ${COMMON_SOURCES}
    src/lambda_main.cpp
)

add_executable(dealr-lambda ${LAMBDA_SOURCES})

target_include_directories(dealr-lambda PRIVATE
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(dealr-lambda PRIVATE
    AWS::aws-lambda-runtime
    nlohmann_json::nlohmann_json
    ortools::ortools
)

if(MSVC)
    target_compile_options(dealr-lambda PRIVATE /W4)
else()
    target_compile_options(dealr-lambda PRIVATE -Wall -Wextra -pedantic)
endif()

install(TARGETS dealr-lambda DESTINATION bin)
