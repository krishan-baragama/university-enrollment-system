# University Enrollment System

## Setup
npm install
npm run dev

## What it does
A University Enrollment System built with DDD, 
Branded Types and Observer Pattern.

## Scenarios demonstrated
1. Successful enrollment
2. Course reaches 80% capacity warning
3. Course becomes full
4. Student exceeds 18 credit limit
5. Cancel an enrollment

## Project Structure
src/domain/student    - Student entity and types
src/domain/course     - Course entity and types
src/domain/enrollment - Enrollment entity and business logic
src/domain/events     - Domain events
src/infrastructure    - Observer pattern