#pragma once

#include <vector>
#include <optional>
#include <string>
#include "../models/types.hpp"

namespace dealr {

struct MILPResult {
    std::vector<Settlement> settlements;
    std::vector<std::string> warnings;
};

MILPResult solveMILP(
    const std::vector<PlayerBalance>& balances,
    std::optional<int> maxTransfersPerPlayer = std::nullopt,
    std::optional<double> minTransferAmount = std::nullopt
);

}
