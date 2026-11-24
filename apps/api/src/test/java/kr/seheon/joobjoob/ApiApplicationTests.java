package kr.seheon.joobjoob;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiApplicationTests {

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void healthIsUp() {
		String body = RestClient.create("http://localhost:" + port)
			.get()
			.uri("/actuator/health")
			.retrieve()
			.body(String.class);

		assertThat(body).contains("\"status\":\"UP\"");
	}

	@Test
	void flywayMigrationsApplied() {
		Integer applied = jdbc.queryForObject(
				"select count(*) from flyway_schema_history where success", Integer.class);

		assertThat(applied).isPositive();
	}

}
