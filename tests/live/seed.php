<?php

declare(strict_types=1);

// This harness is outside the backend and never adds a test HTTP endpoint.
$root = getenv('SHULEOS_API_ROOT');
if (! $root || ! is_file($root.'/vendor/autoload.php')) {
    throw new RuntimeException('SHULEOS_API_ROOT must identify the pinned test checkout.');
}
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\Support\Database\SchoolBuilder;
use Tests\Support\Database\RoleBuilder;
use Tests\Support\Database\UserBuilder;
use Tests\Support\Database\TeacherBuilder;
use Tests\Support\Database\GradeBuilder;
use Tests\Support\Database\StreamBuilder;
use Tests\Support\Database\LearnerBuilder;
use Tests\Support\Database\AcademicYearBuilder;
use Tests\Support\Database\TermBuilder;
use Tests\Support\Database\LearningAreaBuilder;
use Tests\Support\Database\LearningAreaAllocationBuilder;

if (! app()->environment('testing') || config('database.default') !== 'pgsql'
    || config('database.connections.pgsql.database') !== 'shuleos_live_integration_test'
    || ! in_array(config('database.connections.pgsql.host'), ['127.0.0.1', 'localhost'], true)
    || config('mail.default') !== 'log' || config('cache.default') !== 'file'
    || is_file($root.'/bootstrap/cache/config.php')) {
    throw new RuntimeException('Refusing to run outside the isolated live integration environment.');
}
if (($argv[1] ?? '') === 'reset-cache') {
    // Independent tests get independent rate-limit buckets; each test verifies its own sessions.
    Cache::flush();
    exit(0);
}
if (DB::table('schools')->exists()) {
    throw new RuntimeException('Fixture creation requires a freshly migrated empty-school database.');
}
$required = [
    'Teacher' => ['access_teacher_portal', 'view_own_teacher_assignments'],
    'School Admin' => ['view_admin_dashboard'],
    'Principal' => ['access_leadership_portal_phase_two', 'view_principal_dashboard'],
    'Parent' => ['access_parent_portal_phase_two', 'view_linked_learners'],
    'Learner' => ['access_learner_portal_phase_two'],
];
foreach ($required as $roleName => $permissions) {
    $role = DB::table('roles')->where('role_name', $roleName)->first();
    $granted = $role ? DB::table('role_permissions')->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')->where('role_id', $role->id)->pluck('permission_name')->all() : [];
    echo 'Baseline role grant check: '.json_encode(['role' => $roleName, 'missing' => array_values(array_diff($permissions, $granted))], JSON_THROW_ON_ERROR)."\n";
}
$fixture = ['password' => 'Fixture#'.bin2hex(random_bytes(12)), 'schools' => []];
foreach (['Alpha', 'Beta'] as $name) {
    $school = SchoolBuilder::create([
        'school_name' => $name.' Live Test School', 'school_code' => 'LIVE-'.$name,
        'short_name' => $name, 'lifecycle_state' => 'active', 'timezone' => 'Africa/Nairobi',
        'locale' => 'en', 'registration_number' => 'LIVE-'.$name, 'school_type' => 'Public',
        'operating_mode' => 'day', 'county' => 'Nairobi', 'phone' => '+254700000000',
        'email' => strtolower($name).'@example.test',
    ]);
    $year = AcademicYearBuilder::create($school, ['year_name' => date('Y'), 'start_date' => date('Y').'-01-01', 'end_date' => date('Y').'-12-31']);
    $term = TermBuilder::create($school, $year, ['start_date' => date('Y').'-01-01', 'end_date' => date('Y').'-12-31']);
    $grade = GradeBuilder::create($school, null, ['grade_name' => $name.' Grade']);
    $stream = StreamBuilder::create($school, $grade, ['stream_name' => $name.' Stream']);
    $users = [];
    foreach (['admin' => 'School Admin', 'teacher' => 'Teacher', 'leadership' => 'Principal', 'parent' => 'Parent', 'learner' => 'Learner'] as $key => $roleName) {
        $role = RoleBuilder::create(['role_name' => $roleName]);
        $user = UserBuilder::create($school, $role, [
            'username' => 'live-'.strtolower($name).'-'.$key,
            'first_name' => $name, 'last_name' => ucfirst($key),
            'password_hash' => Illuminate\Support\Facades\Hash::make($fixture['password']),
            'auth_generation' => 1,
        ]);
        $users[$key] = ['id' => $user->id, 'username' => $user->username];
    }
    $teacher = TeacherBuilder::create($school, (object) $users['teacher']);
    $area = LearningAreaBuilder::create(['learning_area_name' => $name.' Mathematics']);
    LearningAreaAllocationBuilder::create($school, $grade, $area);
    $assignment = app(App\Services\Teaching\TeacherAssignmentService::class)->create([
        'teacher_id' => $teacher->id, 'learning_area_id' => $area->id, 'grade_id' => $grade->id,
        'stream_id' => $stream->id, 'academic_year_id' => $year->id, 'term_id' => $term->id,
        'lessons_per_week' => 5,
    ], $school->id);
    $learner = LearnerBuilder::create($school, $grade, $stream, ['user_id' => $users['learner']['id'], 'first_name' => $name, 'last_name' => 'Learner']);
    $unlinked = LearnerBuilder::create($school, $grade, $stream, ['first_name' => $name, 'last_name' => 'Unlinked']);
    $parentId = (string) Str::uuid();
    DB::table('parents')->insert(['id' => $parentId, 'school_id' => $school->id, 'user_id' => $users['parent']['id'], 'first_name' => $name, 'last_name' => 'Parent', 'phone' => '+254700000000', 'active' => true, 'is_deleted' => false]);
    DB::table('learner_parents')->insert(['id' => (string) Str::uuid(), 'parent_id' => $parentId, 'learner_id' => $learner->id, 'relationship' => 'Parent', 'is_primary_contact' => true, 'active' => true, 'portal_enabled' => true, 'is_deleted' => false]);
    $fixture['schools'][$name] = ['id' => $school->id, 'name' => $school->school_name, 'users' => $users, 'learnerId' => $learner->id, 'unlinkedLearnerId' => $unlinked->id, 'assignmentId' => $assignment->id];
}
$path = __DIR__.'/fixtures.json';
file_put_contents($path, json_encode($fixture, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
chmod($path, 0600);
echo "Created two synthetic schools and ten role identities. No production records used.\n";
