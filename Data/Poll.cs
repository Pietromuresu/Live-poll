namespace Live_poll.Data;

public class Poll
{
    public int Id { get; set; }
    public string SessionKey { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<PollOption> Options { get; set; } = new List<PollOption>();
    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
}
