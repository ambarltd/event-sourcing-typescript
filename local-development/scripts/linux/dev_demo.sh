#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# Arrays for random name generation
FIRST_NAMES=("James" "Mary" "John" "Patricia" "Robert" "Jennifer" "Michael" "Linda" "William" "Elizabeth"
             "David" "Barbara" "Richard" "Susan" "Joseph" "Jessica" "Thomas" "Sarah" "Charles" "Karen"
             "Emma" "Olivia" "Ava" "Isabella" "Sophia" "Mia" "Charlotte" "Amelia" "Harper" "Evelyn")

LAST_NAMES=("Smith" "Johnson" "Williams" "Brown" "Jones" "Garcia" "Miller" "Davis" "Rodriguez" "Martinez"
            "Hernandez" "Lopez" "Gonzalez" "Wilson" "Anderson" "Thomas" "Taylor" "Moore" "Jackson" "Martin"
            "Lee" "Perez" "Thompson" "White" "Harris" "Sanchez" "Clark" "Ramirez" "Lewis" "Robinson")

# Function to get random name from array
get_random_name() {
    local array=("$@")
    local index=$((RANDOM % ${#array[@]}))
    echo "${array[$index]}"
}

# Function to display progress
show_progress() {
    local duration=$1
    local bar_width=40
    local sleep_interval=$(echo "scale=4; $duration / $bar_width" | bc)
    local progress=0

    echo -n "["
    while [ $progress -lt $bar_width ]; do
        echo -n "="
        progress=$((progress + 1))
        sleep $sleep_interval
    done
    echo -n "]"
    echo
}

# Function to make a POST request with a session token
make_post_request() {
    local endpoint=$1
    local data=$2
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-With-Session-Token: test-session" \
        -d "$data" \
        "http://localhost:8080$endpoint"
}

# Function to submit an application
submit_application() {
    local first_name=$1
    local last_name=$2
    local cuisine=$3
    local experience=$4
    local books=$5

    local data="{
        \"firstName\": \"$first_name\",
        \"lastName\": \"$last_name\",
        \"favoriteCuisine\": \"$cuisine\",
        \"yearsOfProfessionalExperience\": $experience,
        \"numberOfCookingBooksRead\": $books
    }"

    echo -e "${BLUE}Submitting application for $first_name $last_name...${NC}"
    echo -e "Profile:"
    echo -e "  - Cuisine: $cuisine"
    echo -e "  - Professional Experience: $experience years"
    echo -e "  - Cooking Books Read: $books"
    echo -e "Expected outcome: $([ $experience == 0 ] && [ $books -gt 0 ] && echo "${GREEN}Should be APPROVED${NC}" || echo "${RED}Should be REJECTED${NC}")"
    make_post_request "/api/v1/cooking-club/membership/command/submit-application" "$data"
    echo
}

# Function to get members by cuisine
get_members() {
    echo -e "${BLUE}Fetching current members by cuisine...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        "http://localhost:8080/api/v1/cooking-club/membership/query/members-by-cuisine"
}

# Main test script
echo -e "${GREEN}Starting Cooking Club Application Demo${NC}"
echo "=================================================="
echo -e "${YELLOW}Application Rules:${NC}"
echo "1. Approval Criteria:"
echo "   - Must have 0 years of professional experience"
echo "   - Must have read at least 1 cooking book"
echo "2. All other combinations will be rejected"
echo "=================================================="

# Test 1: Should be approved (0 years experience, 3 books read)
echo -e "\n${YELLOW}Test 1: Testing 'Enthusiastic Beginner' Profile${NC}"
echo "This profile represents someone new to professional cooking (0 years)"
echo "but who has studied through books (3 books read)."
submit_application "$(get_random_name "${FIRST_NAMES[@]}")" "$(get_random_name "${LAST_NAMES[@]}")" "Italian" 0 3
show_progress 1

# Test 2: Should not be approved (2 years experience, 5 books read)
echo -e "\n${YELLOW}Test 2: Testing 'Experienced Professional' Profile${NC}"
echo "This profile represents someone with professional experience (2 years)"
echo "and theoretical knowledge (5 books read). Despite the knowledge,"
echo "professional experience disqualifies them."
submit_application "$(get_random_name "${FIRST_NAMES[@]}")" "$(get_random_name "${LAST_NAMES[@]}")" "French" 2 5
show_progress 1

# Test 3: Should be approved (0 years experience, 1 book read)
echo -e "\n${YELLOW}Test 3: Testing 'Minimal Qualifying' Profile${NC}"
echo "This profile represents someone meeting the minimum requirements:"
echo "no professional experience and has read exactly 1 book."
submit_application "$(get_random_name "${FIRST_NAMES[@]}")" "$(get_random_name "${LAST_NAMES[@]}")" "Japanese" 0 1
show_progress 1

# Test 4: Should not be approved (0 years experience, 0 books read)
echo -e "\n${YELLOW}Test 4: Testing 'Complete Beginner' Profile${NC}"
echo "This profile represents someone with no professional experience"
echo "but also no theoretical knowledge (0 books read)."
submit_application "$(get_random_name "${FIRST_NAMES[@]}")" "$(get_random_name "${LAST_NAMES[@]}")" "Mexican" 0 0
show_progress 1

# Wait for async processing
echo -e "\n${BLUE}Waiting for projections...${NC}"
echo "Allowing time for the system to process applications and update projections..."
sleep 1

# Get final results
echo -e "\n${YELLOW}Final Results:${NC}"
echo "Displaying current members grouped by their preferred cuisine."
echo "Only approved applications should appear in these results."
echo "=================================================="
echo ""
echo ""
echo ""
echo ""
get_members
echo ""
echo ""
echo ""
echo ""
echo "=================================================="
echo ""
echo ""
echo -e "\n${GREEN}Demo Completed${NC}"
echo "=================================================="